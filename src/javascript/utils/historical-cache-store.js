Ext.define('TimeboxHistoricalCacheFactory', {
    mixins: {
        observable: 'Ext.util.Observable'
    },
    
    dataContext: null,
    timeboxType: null,
    modelNames: [],
    saveCacheToTimebox: false,
    deliveredDateField: null,
    pointsField: null,
    
    constructor: function (config) {
        _.merge(this,config);
        this.mixins.observable.constructor.call(this, config);

        this.addEvents(
            'status',
            'load'
        );
        this.counter = 0;
    },

    build: function(timeboxes){
        if (this.dataContext === null || this.timeboxType === null || this.deliveredDateField === null || !this.modelNames || this.modelNames.length === 0){
            throw "Please pass a dataContext, timeboxType, deliveredDateField and modelNames configuration.";
        } else {
            //for each group, fetch the snapshots if needed
            var timeboxGroups = this.groupTimeboxes(timeboxes);
                        
            this.counter = 0;
            var promises = _.map(timeboxGroups, function(timeboxGroup){
                return this.buildTimeboxCache(timeboxGroup);
            },this);
            this.totalCount = promises.length; 
            this.updateStatus();
            return Deft.Promise.all(promises);
        }   
    },
    buildTimeboxCache: function(timeboxGroup){
            var deferred = Ext.create('Deft.Deferred');
            
            var filters = this.buildTimeboxFilter(timeboxGroup);
            if (filters.length === 0){
                //No snapshots to load!
                this.updateStatus();
                deferred.resolve(timeboxGroup);
            } else {
               
                this.fetchSnapshots(filters).then({
                    success: function(snapshots){
                        this.processSnapshots(snapshots, timeboxGroup);
                        this.counter++;
                        this.updateStatus();
                        deferred.resolve(timeboxGroup);
                    },
                    failure: function(msg){
                        this.counter++;
                        this.updateStatus();
                        deferred.reject("Error loading snapshots. " + msg);
                    },
                    scope: this 
                });
            }

            return deferred.promise; 
        },
        updateStatus: function(){
            if (this.counter >= this.totalCount){
                this.fireEvent('load');
            } else {
                this.fireEvent('status',Ext.String.format('Loading History... {0}/{1}',this.counter,this.totalCount));
            }
        },
        groupTimeboxes: function(timeboxes){
            return _.groupBy(timeboxes, function(timebox) {
                return timebox.get('Name');
            });
        },
        processSnapshots: function(snapshots, timeboxGroup){
            var snapshotsByTimeboxOid = {};
            console.log('processSnapshots', snapshots);
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
            console.log('processSnapshots', snapshotsByTimeboxOid);
            var updatedTimeboxes = [];
            for (var i=0; i<timeboxGroup.length; i++){
                var timebox = timeboxGroup[i],
                    timeboxOid = timebox.get('ObjectID');
                if (snapshotsByTimeboxOid[timeboxOid]){
                    timebox.buildCacheFromSnaps(snapshotsByTimeboxOid[timeboxOid],this.deliveredDateField,this.pointsField);
                    updatedTimeboxes.push(timebox);
                }
            }
            this.saveHistoricalCacheToTimebox(updatedTimeboxes);
        },
        getTimeboxOidsWithInvalidCache: function(timeboxGroup){
            var currentTimebox = timeboxGroup[0].getEndDateMs() > Date.now();

            //Only get snapshots for timeboxes that don't have an upto date cache 
            var invalidOids = _.reduce(timeboxGroup, function(oids, timebox) {
                var tbOid = timebox.get('ObjectID');
                if (!timebox.isCacheValid() || currentTimebox){
                    oids.push(tbOid);
                }
                return oids; 
            },[]);
            return invalidOids;
        },
        buildTimeboxFilter: function(timeboxGroup){
            var timebox = timeboxGroup[0];
            if (timeboxGroup.length === 0){
                return [];
            }

            var timeboxOids = this.getTimeboxOidsWithInvalidCache(timeboxGroup);
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
            var fields = [this.timeboxType, '_ValidFrom', '_ValidTo', 'ObjectID',this.deliveredDateField,'FormattedID'];
            if (this.pointsField){
                fields.push(this.pointsField);
            }

            var store = Ext.create('Rally.data.lookback.SnapshotStore', {
                autoLoad: false,
                context: this.dataContext,
                fetch: fields,
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
                    console.log('saveHistoricalCacheToTimebox',updatedTimeboxRecords);
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