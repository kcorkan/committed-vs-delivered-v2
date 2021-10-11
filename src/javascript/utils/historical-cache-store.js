Ext.define('TimeboxHistoricalCacheFactory', {
    
    dataContext: null,
    timeboxType: null,
    modelNames: [],
    deliveredDateField: null,
    pointsField: null,
    
    constructor: function (config) {
        _.merge(this,config);
    },

    build: function(timeboxes, status,persistedCacheField){
        if (this.dataContext === null || this.timeboxType === null || this.deliveredDateField === null || !this.modelNames || this.modelNames.length === 0){
            throw "Please pass a dataContext, timeboxType, deliveredDateField and modelNames configuration.";
        } else {
            //for each group, fetch the snapshots if needed
            var timeboxGroups = this.groupTimeboxes(timeboxes);
                        
            var promises = _.map(timeboxGroups, function(timeboxGroup){
                return this.buildTimeboxCache(timeboxGroup, status,persistedCacheField);
            },this);

            return Deft.Promise.all(promises);
        }   
    },
    buildTimeboxCache: function(timeboxGroup, status,persistedCacheField){
            var deferred = Ext.create('Deft.Deferred');
            
            var filters = this.buildTimeboxFilter(timeboxGroup,persistedCacheField);
            if (filters.length === 0){
                //No snapshots to load!
                deferred.resolve(timeboxGroup);
            } else {
               
                this.fetchSnapshots(filters, status).then({
                    success: function(snapshots){
                        console.log('processSnaps',snapshots)
                        this.processSnapshots(snapshots, timeboxGroup,persistedCacheField);
                        deferred.resolve(timeboxGroup);
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
        processSnapshots: function(snapshots, timeboxGroup, persistedCacheField){
            var timeboxType = this.timeboxType; 
            var groupedOids = {};
            if (snapshots.length > 0) {
                
                groupedOids = _.groupBy(snapshots, function(f) {
                    return f.get(timeboxType);
                });
                
                groupedOids = _.reduce(groupedOids,function(obj,snapshots,timebox){
                    var snapsByOid = _.groupBy(snapshots, function(s){
                        if (s.get('FormattedID') === "S182180"){
                            console.log('intimebox',timebox);
                        }
                        return s.get('ObjectID'); 
                    });
                    obj[timebox] = snapsByOid;  
                    return obj
                },{});
            }

            for (var i=0; i<timeboxGroup.length; i++){
                var timebox = timeboxGroup[i],
                    timeboxOid = timebox.get('ObjectID');
                var snaps = [];
                if (groupedOids[timeboxOid]){
                    snaps = groupedOids[timeboxOid];
                    timebox.buildCacheFromSnaps(snaps,this.deliveredDateField,this.pointsField,persistedCacheField);
                }
            }
        },
        getTimeboxOidsWithInvalidCache: function(timeboxGroup,persistedCacheField){
            var currentTimebox = timeboxGroup[0].getEndDateMs() > Date.now();
            //Only get snapshots for timeboxes that don't have an upto date cache 
            var invalidOids = _.reduce(timeboxGroup, function(oids, timebox) {
                var tbOid = timebox.get('ObjectID');
                if (currentTimebox){
                    oids.push(tbOid);
                } else {
                    var persistedCache = timebox.loadCache(persistedCacheField);
                    console.log('persistedCache',persistedCache);
                    if (_.isEmpty(persistedCache) || !persistedCache){
                        oids.push(tbOid);
                    }
                }
                return oids; 
            },[],this);
            return invalidOids;
        },
        buildTimeboxFilter: function(timeboxGroup,persistedCacheField){
            var timebox = timeboxGroup[0];
            if (timeboxGroup.length === 0){
                return [];
            }

            var timeboxOids = this.getTimeboxOidsWithInvalidCache(timeboxGroup,persistedCacheField);
            if (timeboxOids.length === 0){
                return [];
            }
            console.log('invalidTimeboxOids',timeboxOids);
            var timeboxStartIso = timebox.getStartDate().toISOString();
            var timeboxEndIso = timebox.getEndDate().toISOString();
            var dateFilter = Rally.data.lookback.QueryFilter.and([{
                    property: '_ValidFrom',
                    operator: '<=',
                    value: timeboxEndIso
                // },
                // {
                //     property: '_ValidTo',
                //     operator: '>=',
                //     value: timeboxStartIso
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
        fetchSnapshots: function(filters, status){
            var key = 'Loading historical data';
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
                sortConfig: {},
                limit: Infinity,
                remoteSort: false,
                compress: true,
                useHttpPost: true, 
                filters: filters,
                exceptionHandler: function(proxy, request){
                    status.addError(key);
                },
    
                listeners: {
                    beforeload: function(){
                        status.progressStart(key);
                    },
                    load: function(){
                        status.progressEnd(key);
                    },
                    scope: this
                }
            });
            return store.load();
        }
});