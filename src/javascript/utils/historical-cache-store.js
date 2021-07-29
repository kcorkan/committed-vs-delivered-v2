Ext.define('TimeboxHistoricalCacheFactory', {
    
    timeboxes: [],
    dataContext: null,
    timeboxType: null,
    modelNames: [],
    planningWindow: 0,
    timeboxEndDateField: null,
    timeboxStartDateField: null,
    namePrefix: "historicalCache", //for preference cache only
    saveCacheToTimebox: true,
    historicalCacheField: null, 
    
    constructor: function (config) {
        _.merge(this,config);
    },

    build: function(){
            //for each group, fetch the snapshots if needed
            if (!this.saveCacheToTimebox){
                return this.fetchSavedCache().then({
                    scope: this,
                    success: this.buildAllTimeboxCache,
                    failure: this.throwError
                });
            } else {
                return this.buildAllTimeboxCache([])
            }
            
        },
        buildAllTimeboxCache: function(savedCacheRecords){
            console.log('buildAllTimeboxCache: ' + Date.now());
            console.log('savedCacheRecords', savedCacheRecords);
            if (!this.saveCacheToTimebox){
                this.savedCacheRecordsByName = _.reduce(savedCacheRecords, function(obj,cr){
                    obj[cr.get('Name')] = cr;
                    return obj;
                },{});    
            }
            
            var timeboxGroups = this.groupTimeboxes(this.timeboxes);
            
            var promises = _.map(timeboxGroups, function(timeboxGroup){
                if (!this.saveCacheToTimebox){
                    this.updateTimeboxesWithPreferences(timeboxGroup);
                }
                console.log('timeboxGroup 1',timeboxGroup)
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
        updateTimeboxesWithPreferences: function(timeboxGroup){
            var namePrefix = this.getNamePrefix(),
                historicalCacheField = this.getHistoricalCacheField();

            for (var i=0; i<timeboxGroup.length; i++){
                var tbKey = timeboxGroup[i].get('ObjectID');
                var prefName = namePrefix + tbKey;
                console.log('updateTimeboxesWithPreferences prefNme: ',prefName)
                var savedCache = this.savedCacheRecordsByName[prefName];
                if (savedCache){
                    console.log('updateTimeboxesWithPreferences cache: ',savedCache)
                    var cacheValue = savedCache.get('Value');
                    try {
                        
                        console.log('cacheValue',cacheValue);
                        var cache = JSON.parse(cacheValue);
                        console.log('updateTimeboxesWithPreferences cache',cache);
                        timeboxGroup[i].set(historicalCacheField,cache);
                        console.log('updateTimeboxesWithPreferences saved cache',JSON.stringify(timeboxGroup[i].get(historicalCacheField)));
                    } catch(ex){
                        //could not parse json... 
                    }
                }
            }

            return timeboxGroup; 
        },
        getNamePrefix: function(){
            return this.namePrefix + this.timeboxType;
        },
        getHistoricalCacheField: function(){
            return this.historicalCacheField;
        },
        groupTimeboxes: function(timeboxes){
            return _.groupBy(timeboxes, function(timebox) {
                return timebox.get('Name');
            });
        },
        processSnapshots: function(snapshots, timeboxGroup){
            console.log('processsnapshots',snapshots,timeboxGroup);
            var startDate = timeboxGroup[0].get(this.timeboxStartDateField).toISOString(),
                endDate = timeboxGroup[0].get(this.timeboxEndDateField).toISOString();


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

            var cacheByTimeboxOid = {};
            _.each(snapshotsByTimeboxOid, function(snapArrayObject,timeboxOid){
                cacheByTimeboxOid[timeboxOid] = this.buildAddedDeliveredData(snapArrayObject,startDate,endDate);
            },this);

            var historicalCacheField = this.getHistoricalCacheField();
            var newCache = {};
            for (var i=0; i<timeboxGroup.length; i++){
                var timeboxOid = timeboxGroup[i].get('ObjectID');
                var cacheName = timeboxOid;
                if (!this.saveCacheToTimebox){
                    cacheName = this.getNamePrefix() + timeboxOid;
                }    
                if (cacheByTimeboxOid[timeboxOid]){
                    console.log('setting timebox cache')
                    timeboxGroup[i].set(historicalCacheField,cacheByTimeboxOid[timeboxOid]);
                    newCache[cacheName] = JSON.stringify(cacheByTimeboxOid[timeboxOid]);
                    //TODO actually persist this to the timebox record
                } else {
                    console.log('processSnapshots ',timeboxGroup[i].get(historicalCacheField))
                    if (!timeboxGroup[i].get(historicalCacheField)){
                        console.log('processSnapshots setting empty cache');
                        cacheByTimeboxOid[timeboxOid] = this.initializeCache(startDate,endDate);
                        timeboxGroup[i].set(historicalCacheField,cacheByTimeboxOid[timeboxOid]);
                        newCache[cacheName] = JSON.stringify(cacheByTimeboxOid[timeboxOid]);
                    }
                }

            }
            console.log('newCache', newCache)
            if (!_.isEmpty(newCache)){
                console.log('this.saveCacheToTimebox',this.saveCacheToTimebox);
                if (this.saveCacheToTimebox){
                    this.saveHistoricalCacheToTimebox(newCache,timeboxGroup);
                } else {
                    this.saveHistoricalCache(newCache);
                }
            }
           return cacheByTimeboxOid; 
        },
        buildAddedDeliveredData: function(snapArraysByOid,startDate,endDate){
            var cache = this.initializeCache(startDate,endDate),
                startDateMs = Date.parse(startDate),
                endDateMs = Date.parse(endDate);

            _.each(snapArraysByOid, function(snapArray,snapOid){

                var snaps = _.sortBy(snapArray, ["_ValidFrom"]);

                var addedIndex = this.getDayInTimebox(snaps[0]._ValidFrom,startDateMs,endDateMs),
                    lastSnap = snaps[snaps.length-1], 
                    acceptedDate = lastSnap.AcceptedDate || null;
      
                    if (addedIndex >= 0){
                        var delivered = acceptedDate && Date.parse(acceptedDate) < endDateMs && Date.parse(lastSnap._ValidTo) > endDateMs || false;
                
                        cache.countAdded[addedIndex]++;

                        if (delivered){ cache.countDeliveredByAdded[addedIndex]++}
                }
                // console.log('Added: ',cache.countAdded);
                // console.log('Delivered: ',cache.countDeliveredByAdded);
                // console.log('=======');
            }, this);
            console.log('buildAddedDeliered Data', cache);
            return cache;
        },
        initializeCache: function(startDate,endDate){
            var startDateMs = Date.parse(startDate),
                endDateMs = Date.parse(endDate),
                timeboxDays = Math.ceil((endDateMs - startDateMs)/86400000);

            return {
                startDate: startDate,
                endDate: endDate,
                countAdded: this.initializeArray(timeboxDays+1,0),
                countDeliveredByAdded: this.initializeArray(timeboxDays+1,0)
            };
        },
        initializeArray: function(arrLength, arrValue){
            var newArray = [];
            for (var i=0; i<arrLength; i++){
                newArray[i] = arrValue;
            }
            return newArray; 
        },
        getDayInTimebox: function(dateString,startDateMs,endDateMs){
            var dt = Date.parse(dateString);

            if (dt < startDateMs){
                return 0; 
            }
            if (dt > endDateMs){
                return -1;
            }
            var dif = (dt - startDateMs)/86400000; //(endDateMs-startDateMs);
            return Math.floor(dif) + 1;
        },
        getTimeboxOidsWithInvalidCache: function(timeboxGroup){
            console.log('getTimeboxOidsWithInvalidCache timeboxGroup',timeboxGroup,this.timeboxStartDateField,this.timeboxEndDateField);
            var startDate = timeboxGroup[0].get(this.timeboxStartDateField).toISOString();
            var endDate = timeboxGroup[0].get(this.timeboxEndDateField).toISOString();
            var currentTimebox = Date.parse(endDate) > Date.now();

            //Only get snapshots for timeboxes that don't have an upto date cache 
            var historicalCacheField = this.getHistoricalCacheField();
            var invalidOids = _.reduce(timeboxGroup, function(oids, timebox) {
                
                var cache = timebox.get(historicalCacheField),
                    tbOid = timebox.get('ObjectID');
                //console.log('getTimeboxOidsWithInvalidCache cache',cache, timebox.getData());
                //console.log('getTimeboxOidsWithInvalidCache currentTimebox',currentTimebox);
                if (!cache || currentTimebox){
                    //console.log('getTimeboxOidsWithInvalidCache no cache or currentTimebox')
                    oids.push(tbOid);
                } else {
                    try {
                       cache = JSON.parse(cache);
                       console.log('getTimeboxOidsWithInvalidCache cache',cache)
                        if ((cache.startDate != startDate) || 
                        (cache.endDate != endDate)){
                            //console.log('getTimeboxOidsWithInvalidCache times dont match' + cache.startDate + ' ' +startDate );
                            console.log('getTimeboxOidsWithInvalidCache times dont match' + cache.endDate + ' ' +endDate );
                            //we need to reload because the dates changed.  
                            oids.push(tbOid);
                        }
                    } catch (ex){
                        //console.log('getTimeboxOidsWithInvalidCache error' + ex);
                        oids.push(tbOid);
                    }
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
                fetch: [this.timeboxType, '_ValidFrom', '_ValidTo', 'ObjectID','AcceptedDate'],
                hydrate: [],
                pageSize: 10000,
                limit: Infinity,
                remoteSort: false,
                compress: true,
                useHttpPost: true, // TODO (tj) verify POST is used
                filters: filters,
            });
            return store.load();
        },
        fetchSavedCache: function(){
            console.log('fetchSavedCache: ' + Date.now());
            return Ext.create('Rally.data.wsapi.Store',{
                model: 'Preference',
                fetch: ['AppID','Name','Type','Value'],
                filters: [{
                    property: 'AppID',
                    value: this.appId
                },{
                    property: "Workspace",
                    value: this.dataContext.workspace
                },{
                    property: 'Name',
                    operator: 'contains',
                    value: this.getNamePrefix()
                },{
                    property: "Project",
                    value: null
                }],
                pageSize: 2000,
                limit: Infinity 
            }).load();
        },
        saveHistoricalCacheToTimebox: function(newCache, timeboxGroup){
            var timeboxRecords = [];
            for (var i=0; i<timeboxGroup.length ; i++){
                var timebox = timeboxGroup[i];
                if (newCache[timebox.get('ObjectID')]){
                    timebox.set(this.historicalCacheField,newCache[timebox.get('ObjectID')]);
                    timeboxRecords.push(timebox);
                }
            }
            if (timeboxRecords.length > 0){
                var store = Ext.create('Rally.data.wsapi.batch.Store', {
                    data: timeboxRecords
                });
                store.sync({
                    success: function() {
                        console.log('timeboxRecords saved',timeboxRecords.length);
                    },
                    failure: function(){
                        console.log('timeboxRecords save FAILED',timeboxRecords.length);
                    }
                });
            }
        },
        saveHistoricalCache: function(newCache){
            //Save to preferences or save to objects
            var appId = this.appId,
                workspace = this.dataContext.workspace; 

            var savedCacheRecordsByName = this.savedCacheRecordsByName;
            Rally.data.ModelFactory.getModel({
                type: 'Preference',
                success: function(model){
                    _.each(newCache, function(v,k){
                        var rec = null; 
                        if (savedCacheRecordsByName[k]){
                            rec = savedCacheRecordsByName[k];
                            rec.set('Value',v);
                        } else {
                            rec = Ext.create(model, {
                                Name: k,
                                AppId: appId,
                                Workspace: workspace,
                                Project: null,
                                Value: v 
                            });
                            
                        }
                        rec.save({
                            callback: function(record, operation){
                                if (!operation.wasSuccessful()){
                                    console.log("Workspace: " + workspace);
                                    console.log("AppId: " + appId);
                                    console.log("Value: " + v);
                                    console.log(Ext.String.format('preference {0} save failed: {1}',k,operation.error.errors.join(",")));
                                } else {
                                    console.log('Preference saved: ' + k);
                                }
                            }
                        });
                        
                    });
                }
            });
        }
});