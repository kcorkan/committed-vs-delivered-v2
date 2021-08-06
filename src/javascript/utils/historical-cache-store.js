Ext.define('TimeboxHistoricalCacheFactory', {
    
    dataContext: null,
    timeboxType: null,
    modelNames: [],
    saveCacheToTimebox: false,
    deliveredDateField: null,
    
    constructor: function (config) {
        _.merge(this,config);
    },

    build: function(timeboxes){
        if (this.dataContext === null || this.timeboxType === null || this.deliveredDateField === null || !this.modelNames || this.modelNames.length === 0){
            throw "Please pass a dataContext, timeboxType, deliveredDateField and modelNames configuration.";
        } else {
            //for each group, fetch the snapshots if needed
            var timeboxGroups = this.groupTimeboxes(timeboxes);
                        
            var promises = _.map(timeboxGroups, function(timeboxGroup){
                return this.buildTimeboxCache(timeboxGroup);
            },this);
            return Deft.Promise.all(promises);
        }   
    },
    buildTimeboxCache: function(timeboxGroup){
            var deferred = Ext.create('Deft.Deferred');
            console.log('buildTimeboxCache',timeboxGroup);

            var filters = this.buildTimeboxFilter(timeboxGroup);
            if (filters.length === 0){
                //No snapshots to load!
                deferred.resolve(timeboxGroup);
            } else {
                console.log('fetchSnapshots start:' + Date.now());
                console.log('fetchSnapshots filters:', filters);

                this.fetchSnapshots(filters).then({
                    success: function(snapshots){
                        console.log('fetchSnapshots end:' + Date.now() + ' snaps.length: ' + snapshots.length);
                        this.processSnapshots(snapshots, timeboxGroup);
                        deferred.resolve(timeboxGroup)
                    },
                    failure: function(msg){
                        deferred.reject("Error loading snapshots. " + msg);
                    },
                    scope: this 
                });
            }
            return deferred.promise; 
        },
        groupTimeboxes: function(timeboxes){
            return _.groupBy(timeboxes, function(timebox) {
                return timebox.get('Name');
            });
        },
        processSnapshots: function(snapshots, timeboxGroup){
            console.log('processsnapshots',snapshots,timeboxGroup);
            console.log('timeboxGroup ', timeboxGroup[0].get('Name'));

            var snapshotsByTimeboxOid = {};
            if (snapshots.length > 0) {
                
                for (var i=0; i<snapshots.length; i++){
                    var snapshot = snapshots[i].getData();
                    var timeboxOid = snapshot[this.timeboxType];
                    if (!snapshotsByTimeboxOid[timeboxOid]){
                        snapshotsByTimeboxOid[timeboxOid] = {};
                    }
                    var snap_oid = snapshot.ObjectID;
                    if (!snapshotsByTimeboxOid[timeboxOid][snap_oid]){
                        snapshotsByTimeboxOid[timeboxOid][snap_oid] = [];
                    }
                    snapshotsByTimeboxOid[timeboxOid][snap_oid].push(snapshot);
                }
            }

            var updatedTimeboxes = [];

            for (var i=0; i<timeboxGroup.length; i++){
                var timebox = timeboxGroup[i],
                    timeboxOid = timebox.get('ObjectID');

                if (snapshotsByTimeboxOid[timeboxOid]){
                    timebox.buildCacheFromSnaps(snapshotsByTimeboxOid[timeboxOid],this.deliveredDateField);
                    updatedTimeboxes.push(timebox);
                }
            }
            this.saveHistoricalCacheToTimebox(updatedTimeboxes);
        },
        getTimeboxOidsWithInvalidCache: function(timeboxGroup){
            console.log('getTimeboxOidsWithInvalidCache timeboxGroup',timeboxGroup);
            var currentTimebox = timeboxGroup[0].getEndDateMs() > Date.now();

            //Only get snapshots for timeboxes that don't have an upto date cache 
            var invalidOids = _.reduce(timeboxGroup, function(oids, timebox) {
                var tbOid = timebox.get('ObjectID');
                console.log('timebox',timebox);
                if (!timebox.isCacheValid() || currentTimebox){
                    oids.push(tbOid);
                }
                return oids; 
            },[]);
            console.log('getTimeboxOidsWithInvalidCache invalidOids',invalidOids)
            return invalidOids;
        },
        buildTimeboxFilter: function(timeboxGroup){
            console.log('buildTimeboxFilter timeboxGroup',timeboxGroup);
            var timebox = timeboxGroup[0];
            if (timeboxGroup.length === 0){
                return [];
            }

            var timeboxOids = this.getTimeboxOidsWithInvalidCache(timeboxGroup);
            console.log('buildTimeboxFilter timeboxOids',timeboxOids);
            if (timeboxOids.length === 0){
                return [];
            }

            var timeboxStartIso = timebox.getStartDate().toISOString();
            var timeboxEndIso = timebox.getEndDate().toISOString();
            var dateFilter = Rally.data.lookback.QueryFilter.and([{
                    property: '_ValidFrom',
                    operator: '<=',
                    value: timeboxEndIso
                },
                {
                    property: '_ValidTo',
                    operator: '>=',
                    value: timeboxStartIso
                }
            ]);
          
            var filters = [{
                    property: '_TypeHierarchy',
                    operator: 'in',
                    value: this.modelNames
                },
                {
                    property: this.timeboxType,
                    operator: 'in',
                    value: timeboxOids
                },
                //may not need this filter since the project is associated with the timeboxoids, but keeping to verify if it helps with performance.
                {
                    property: '_ProjectHierarchy',
                    value: Rally.util.Ref.getOidFromRef(this.dataContext.project)
                },
                dateFilter
            ];
            return filters;
        },
        fetchSnapshots: function(filters){
            var store = Ext.create('Rally.data.lookback.SnapshotStore', {
                autoLoad: false,
                context: this.dataContext,
                fetch: [this.timeboxType, '_ValidFrom', '_ValidTo', 'ObjectID',this.deliveredDateField,'FormattedID'],
                hydrate: [],
                pageSize: 20000,
                limit: Infinity,
                remoteSort: false,
                compress: true,
                useHttpPost: true, 
                filters: filters,
            });
            return store.load();
        },
       
        saveHistoricalCacheToTimebox: function(updatedTimeboxRecords){
            if (this.saveCacheToTimebox === true){
                if (updatedTimeboxRecords.length > 0){
                    var store = Ext.create('Rally.data.wsapi.batch.Store', {
                        data: updatedTimeboxRecords
                    });
                    store.sync({
                        success: function() {
                            console.log('timeboxRecords saved',updatedTimeboxRecords.length);
                        },
                        failure: function(){
                            console.log('timeboxRecords save FAILED',updatedTimeboxRecords.length);
                        }
                    });
                }
            }
        }
});