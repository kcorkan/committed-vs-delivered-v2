Ext.define('TimeboxHistoricalCacheFactory', {
    
    timeboxes: [],
    dataContext: null,
    timeboxType: null,
    modelNames: [],
//    planningWindow: 0,
    timeboxEndDateField: null,
    timeboxStartDateField: null,
  //  namePrefix: "historicalCache", //for preference cache only
    saveCacheToTimebox: false,
   // historicalCacheField: null, 
    
    constructor: function (config) {
        _.merge(this,config);
    },

    build: function(timeboxes){
        //for each group, fetch the snapshots if needed
        var timeboxGroups = this.groupTimeboxes(timeboxes);
            
        var promises = _.map(timeboxGroups, function(timeboxGroup){
            return this.buildTimeboxCache(timeboxGroup);
        },this);
        return Deft.Promise.all(promises);
            
    },
    throwError: function(errorString){
        console.log('error!',errorString);
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
                    failure: this.throwError,
                    scope: this 
                });
            }
            return deferred.promise; 
        },
        // updateTimeboxesWithPreferences: function(timeboxGroup){
        //     var namePrefix = this.getNamePrefix(),
        //         historicalCacheField = this.getHistoricalCacheField();

        //     for (var i=0; i<timeboxGroup.length; i++){
        //         var tbKey = timeboxGroup[i].get('ObjectID');
        //         var prefName = namePrefix + tbKey;
        //         console.log('updateTimeboxesWithPreferences prefNme: ',prefName)
        //         var savedCache = this.savedCacheRecordsByName[prefName];
        //         if (savedCache){
        //             console.log('updateTimeboxesWithPreferences cache: ',savedCache)
        //             var cacheValue = savedCache.get('Value');
        //             try {
                        
        //                 console.log('cacheValue',cacheValue);
        //                 var cache = JSON.parse(cacheValue);
        //                 console.log('updateTimeboxesWithPreferences cache',cache);
        //                 timeboxGroup[i].set(historicalCacheField,cache);
        //                 console.log('updateTimeboxesWithPreferences saved cache',JSON.stringify(timeboxGroup[i].get(historicalCacheField)));
        //             } catch(ex){
        //                 //could not parse json... 
        //             }
        //         }
        //     }

        //     return timeboxGroup; 
        // },
        // getNamePrefix: function(){
        //     return this.namePrefix + this.timeboxType;
        // },
        // getHistoricalCacheField: function(){
        //     return this.historicalCacheField;
        // },
        groupTimeboxes: function(timeboxes){
            return _.groupBy(timeboxes, function(timebox) {
                return timebox.get('Name');
            });
        },
        processSnapshots: function(snapshots, timeboxGroup){
            console.log('processsnapshots',snapshots,timeboxGroup);
            var startDate = timeboxGroup[0].get(this.timeboxStartDateField).toISOString(),
                endDate = timeboxGroup[0].get(this.timeboxEndDateField).toISOString();
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
                    timebox.buildCacheFromSnaps(snapshotsByTimeboxOid[timeboxOid]);
                    updatedTimeboxes.push(timebox);
                }
            }

            this.saveHistoricalCacheToTimebox(updatedTimeboxes);
            
        },
        // buildAddedDeliveredData: function(snapArraysByOid,startDate,endDate){
        //     var cache = this.initializeCache(startDate,endDate),
        //         startDateMs = Date.parse(startDate),
        //         endDateMs = Date.parse(endDate);

        //     _.each(snapArraysByOid, function(snapArray,snapOid){

        //         var snaps = _.sortBy(snapArray, ["_ValidFrom"]);
        //         var cacheObject = {
        //             "FormattedID": snaps[0].FormattedID,
        //             "ObjectID": snapOid
        //         }
                
        //         console.log(snaps[0].FormattedID);

        //         var addedIndex = this.getDayInTimebox(snaps[0]._ValidFrom,startDateMs,endDateMs),
        //             lastSnap = snaps[snaps.length-1], 
        //             acceptedDate = lastSnap.AcceptedDate || null;
        //             cacheObject.AcceptedDate = acceptedDate;
        //             cacheObject.ValidFrom = snaps[0]._ValidFrom;
        //             cacheObject.ValidTo = lastSnap._ValidTo;  
        //             cacheObject.Count = snaps.length; 
                    
        //             cache.objects.push(cacheObject);
        //             if (addedIndex >= 0){
        //                 var delivered = acceptedDate && Date.parse(acceptedDate) < endDateMs && Date.parse(lastSnap._ValidTo) > endDateMs || false;
                
        //                 cache.countAdded[addedIndex]++;

        //                 if (delivered){ cache.countDeliveredByAdded[addedIndex]++}
        //         }
        //         // console.log('Added: ',cache.countAdded);
        //         // console.log('Delivered: ',cache.countDeliveredByAdded);
        //         // console.log('=======');
        //     }, this);
        //     console.log('buildAddedDeliered Data', cache);
        //     return cache;
        // },
        // initializeCache: function(startDate,endDate){
        //     var startDateMs = Date.parse(startDate),
        //         endDateMs = Date.parse(endDate),
        //         timeboxDays = Math.ceil((endDateMs - startDateMs)/86400000);

        //     return {
        //         version: 2,
        //         startDate: startDate,
        //         endDate: endDate,
        //         countAdded: this.initializeArray(timeboxDays+1,0),
        //         countDeliveredByAdded: this.initializeArray(timeboxDays+1,0),
        //         objects: []
        //     };
        // },
        // initializeArray: function(arrLength, arrValue){
        //     var newArray = [];
        //     for (var i=0; i<arrLength; i++){
        //         newArray[i] = arrValue;
        //     }
        //     return newArray; 
        // },
        // getDayInTimebox: function(dateString,startDateMs,endDateMs){
        //     var dt = Date.parse(dateString);

        //     if (dt < startDateMs){
        //         return 0; 
        //     }
        //     if (dt > endDateMs){
        //         return -1;
        //     }
        //     var dif = (dt - startDateMs)/86400000; //(endDateMs-startDateMs);
        //     return Math.floor(dif) + 1;
        // },
        getTimeboxOidsWithInvalidCache: function(timeboxGroup){
            console.log('getTimeboxOidsWithInvalidCache timeboxGroup',timeboxGroup,this.timeboxStartDateField,this.timeboxEndDateField);
            var currentTimebox = Date.parse(timeboxGroup[0].get(this.timeboxEndDateField)) > Date.now();

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

            var timeboxStartIso = timebox.get(this.timeboxStartDateField).toISOString();
            var timeboxEndIso = timebox.get(this.timeboxEndDateField).toISOString();
            //var planningWindowEndIso = Ext.Date.add(timebox.get(this.timeboxStartDateField), Ext.Date.DAY, this.getSetting('planningWindow')).toISOString();
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
                //may not need this filter since the project is associated with the timeboxoids 
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
                fetch: [this.timeboxType, '_ValidFrom', '_ValidTo', 'ObjectID','AcceptedDate','FormattedID'],
                hydrate: [],
                pageSize: 20000,
                limit: Infinity,
                remoteSort: false,
                compress: true,
                useHttpPost: true, // TODO (tj) verify POST is used
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