Ext.define('TimeboxCacheModelBuilder',{
    singleton: true,
    
    CACHE_VERSION:   3,
                    
    //Cache Indexes 
    VALID_FROM_IDX: 0,
    VALID_TO_IDX: 1,
    DELIVERED_IDX:  2,
    PLANNED_POINTS_IDX: 3,
    DELIVERED_POINTS_IDX: 4,
    FID_IDX: 5, 
    COUNT_IDX: 6,
    ROLLOVER_COUNT_IDX: 7,
    ROLLOVER_IDX: 8,
   
    VIRTUAL_CACHE_FIELD_NAME: "__unpersistedCache",
   
    getExportFieldsHash: function(fields){
        //coordinate this with getCacheDataForExport

        var hash = {
            ObjectID: "Object ID",
            FormattedID: "Formatted ID",
            ValidFrom: "Added to Timebox on or Before",
            ValidTo: "Removed from Timebox on or After",
            DeliveredDate: "Delivered Date",
            SnapCount: "Snapshot Count for Timebox",
            TimeboxName: "Timebox",
            Project: "Project",
            StartDate: "Timebox Start Date",
            EndDate: "Timebox End Date",
            PlannedPoints: "Points Planned",
            DeliveredPoints: "Points Delivered",
            Delivered: "is Delivered in Timebox",
            Planned: "is Planned",
            Included: "is Included in Dataset",
            PlanningDate: "Planning Date Cutoff"
        };
        return _.reduce(fields, function(obj,f){
            if (!hash[f]){
                hash[f] =f; 
            }
            return hash;
        },hash);
    },
    build: function(modelType,newModelName,persistedCacheFieldName,timeboxStartDateField,timeboxEndDateField) {
        var deferred = Ext.create('Deft.Deferred');
        Rally.data.ModelFactory.getModel({
            type: modelType,
            success: function(model) {
                var default_fields = []; 
                
                //if (historicalCacheFieldName === null){
                var historicalCacheFieldName = TimeboxCacheModelBuilder.VIRTUAL_CACHE_FIELD_NAME;
                default_fields.push({
                    name: historicalCacheFieldName,
                    defaultValue: null,
                    type: 'object'
                 },{
                     name: 'orderIndex',
                     defaultValue: 0,
                     type: 'integer'
                 });    
                //}

                
                var new_model = Ext.define(newModelName, {
                    extend: model,
                    //mixins: ['TimeboxCacheMixin'],
                    timeboxStartDateField: timeboxStartDateField,
                    timeboxEndDateField: timeboxEndDateField,
                    historicalCacheField: historicalCacheFieldName,
                    persistedCacheField: persistedCacheFieldName,
                    fields: default_fields,
                    __isDirty: false,
                    clearCache: function(persistedCacheField,force){
                        //Unless force is passed, this will only clean cached fields that are not valid
                        var currentPersistedCache = this.getPersistedCacheObject(persistedCacheField);
                        if (!_.isEmpty(currentPersistedCache)){
                            if (force || !this.isCacheValid()){
                            //if (force || !currentPersistedCache.checksum || currentPersistedCache.checksum !== this.getChecksum()){
                                this.set(persistedCacheField,null);
                                return true;  
                            }
                        }
                        return false;
                    },
                    isCacheValid: function(cacheObject){
                        if (!cacheObject){ return false; }
                        return cacheObject.version == TimeboxCacheModelBuilder.CACHE_VERSION &&
                                cacheObject.startDate == this.getStartDateMs() &&
                                cacheObject.endDate == this.getEndDateMs();
                    },
                    getStartDate: function(){
                        return this.get(this.timeboxStartDateField);
                    },
                    getEndDate: function(){
                        return this.get(this.timeboxEndDateField);
                    },
                    getStartDateMs: function(){
                        return Date.parse(this.get(this.timeboxStartDateField));
                    },
                    getEndDateMs: function(){
                        return Date.parse(this.get(this.timeboxEndDateField));
                    },
                    isRolloverValid: function(){
                        var cacheObj = this.getCacheObject();
                        var rollovers = false;  
                        _.each(cacheObj.data, function(v,k){
                            if (v[TimeboxCacheModelBuilder.ROLLOVER_COUNT_IDX] >= 0){
                                rollovers= true; //If at least 1 object has rollovers, then we know this is valid.  
                                return false;   
                            }
                        });
                        return rollovers; 
                    },
                    buildCacheFromSnaps: function(snapArraysByOid,deliveredDateField,pointsField,cacheField){
                        var cache = {
                                startDate: this.getStartDateMs(),
                                endDate: this.getEndDateMs(),
                                version: TimeboxCacheModelBuilder.CACHE_VERSION,
                                data: {}
                            };
                        var startDateMs = this.getStartDateMs();
                        
                        _.each(snapArraysByOid, function(snapArray,snapOid){
                            
                            var snaps = _.sortBy(snapArray, function(s){ 
                                return new Date(s.data._ValidFrom).getTime();
                            }).filter(function(snap){
                                return !(new Date(snap.data._ValidTo).getTime() <= startDateMs);
                            });

                            if (snaps.length > 0){

                                var firstDayInRange = snaps[0].data._ValidFrom,
                                    lastSnap = snaps[snaps.length - 1].data,
                                    lastDayInRange = lastSnap._ValidTo,
                                    deliveredDate = lastSnap[deliveredDateField] || null
                                    validFromPoints = snaps[0][pointsField],
                                    validToPoints = lastSnap[pointsField];
                                var cacheData = [];

                                cacheData[TimeboxCacheModelBuilder.VALID_FROM_IDX] = Date.parse(firstDayInRange);
                                cacheData[TimeboxCacheModelBuilder.VALID_TO_IDX] = Date.parse(lastDayInRange);
                                cacheData[TimeboxCacheModelBuilder.DELIVERED_IDX] = deliveredDate && Date.parse(deliveredDate);
                                cacheData[TimeboxCacheModelBuilder.PLANNED_POINTS_IDX] = snaps[0].data[pointsField] || 0;
                                cacheData[TimeboxCacheModelBuilder.DELIVERED_POINTS_IDX] = lastSnap[pointsField] || 0;
                                cacheData[TimeboxCacheModelBuilder.COUNT_IDX] = snaps.length;
                                cacheData[TimeboxCacheModelBuilder.FID_IDX] = snaps[0].data['FormattedID'];
                                cacheData[TimeboxCacheModelBuilder.ROLLOVER_COUNT_IDX] = -1;
                                
                                cache.data[snapOid] = cacheData;
                            } 
                            
                        }, this);
                
                        this.set(this.historicalCacheField,cache);
                        if (cacheField){
                            this.set(cacheField,JSON.stringify(cache));
                            this.__isDirty = true;
                        }
                    },
                    getRolloverData: function(useFormattedID){
                        var cacheObj = this.getCacheObject();
                       // console.log('getRolloverData',cacheObj);
                        var count = 0;
                        var rollovers = []; 

                        _.each(cacheObj.data, function(v,k){
                            if (v[TimeboxCacheModelBuilder.ROLLOVER_COUNT_IDX] > 0){
                                if (useFormattedID){
                                    rollovers.push(v[TimeboxCacheModelBuilder.FID_IDX]);
                                } else {
                                    rollovers.push(k);
                                }
                                
                            } else {
                                count++;
                            }
                        });
                        return {
                            zeroCount: count,
                            rollovers: rollovers
                        }; 
                    },
                    getRollovers: function(useFormattedID){
                        var cacheObj = this.getCacheObject();

                        return _.reduce(cacheObj.data, function(arr,v,k){
                            if (v[TimeboxCacheModelBuilder.ROLLOVER_COUNT_IDX] > 0){
                                if (useFormattedID){
                                    arr.push(v[TimeboxCacheModelBuilder.FID_IDX]);
                                } else {
                                    arr.push(k);
                                }
                            } 
                            return arr; 
                        },[]);   
                    },
                    getRolloverObjectCountHash: function(useFormattedID){
                        var cacheObj = this.getCacheObject();
                        var hash = {};
                        _.each(cacheObj.data, function(v,k){
                            var oid = k; 
                            if (useFormattedID){
                                oid = v[TimeboxCacheModelBuilder.FID_IDX];
                            }
                            if (v[TimeboxCacheModelBuilder.ROLLOVER_COUNT_IDX] === -1){
                                v[TimeboxCacheModelBuilder.ROLLOVER_COUNT_IDX] = 0;
                            }
                            hash[oid] = v[TimeboxCacheModelBuilder.ROLLOVER_COUNT_IDX] || 0;  
                        });
                        return hash;  
                    },

                    addRollover: function(objectID,rolloverCount,cacheField){
                        var cacheObj = this.getCacheObject();
                        if (!cacheObj.data){

                            console.log('no cache object', this.get('Name'), this.get('ObjectID'), this.getCacheObject());
                            return;
                        }
                        if (!cacheObj.data[objectID]){
                            console.log('objectID not found in iteration',this.get('Name'), this.get('StartDate'),this.get('EndDate'),objectID);
                            return;
                        } 
                     
                        cacheObj.data[objectID][TimeboxCacheModelBuilder.ROLLOVER_COUNT_IDX] = rolloverCount;
                        this.set(this.historicalCacheField,cacheObj);
                        if (cacheField){
                            this.set(cacheField,JSON.stringify(cacheObj));
                            this.__isDirty = true;
                        }
                    },
                    getCacheObject: function(){
                        var cache = this.get(this.historicalCacheField) || {};
                        if (_.isEmpty(cache) && this.persistedCacheField){
                            console.log('getCacheObject: loading from persisted field',this.persistedCacheField);
                            this.loadCache(this.persistedCacheField);
                            cache = this.get(this.historicalCacheField) || {};
                        }
                        return cache;
                    },
                    getPersistedCacheObject: function(cacheField){
                        try {
                            return JSON.parse(this.get(cacheField));
                        } catch(ex){
                        }
                        return {};
                    },
                    loadCache: function(cacheField){
                        if (cacheField){
                           // console.log('loadCache', this.get(cacheField))
                            var cache = this.getPersistedCacheObject(cacheField);
                            if (!_.isEmpty(cache)){
                                if (cache.version == TimeboxCacheModelBuilder.CACHE_VERSION &&
                                    cache.startDate == this.getStartDateMs() && cache.endDate == this.getEndDateMs()){
                                    this.set(this.historicalCacheField, cache);
                                    return true; 

                                } 
                            }
                        }
                       // console.log('loadCache',cache);
                        return false; 
                    },
                    persistCache: function(cacheField){
                        //NOTE: todo -- If the length of the cached data is > limit, we cannot save it to cache and it will always need to be
                        //reloaded
                        if (!cacheField || this.getEndDate() > new Date()){
                            return false; 
                        }
             
                        return this.__isDirty; 
                    },
                    getPlannedDeliveredMetrics: function(planningWindowShiftInDays, minDurationInHours,excludeAcceptedBeforeStart,usePoints){
                        var metrics = {
                            planned: 0,
                            unplanned: 0,
                            plannedDelivered: 0,
                            unplannedDelivered: 0,
                            acceptedBeforeStart: 0 
                        };
               
                       var cache = this.getCacheObject(),
                           startDateMs = this.getStartDateMs(),
                           endDateMs = this.getEndDateMs(),
                           planningDateMs = startDateMs + 86400000 * planningWindowShiftInDays,
                           minDuration = minDurationInHours * 3600000;  

                       _.each(cache.data, function(dataArray, oid){
             
                            var included = this.isIncluded(dataArray,excludeAcceptedBeforeStart,minDuration,startDateMs,endDateMs);
                           if (included && this.isDataPlanned(dataArray, planningDateMs)){
                               metrics.planned += this.getPlannedMetric(dataArray,usePoints);
                               if (this.isDataDelivered(dataArray,endDateMs)){
                                   metrics.plannedDelivered += this.getDeliveredMetric(dataArray,usePoints);
                               }
                           }
                           if (included && this.isDataUnplanned(dataArray,planningDateMs)){
                               metrics.unplanned += this.getPlannedMetric(dataArray,usePoints);
                               if (this.isDataDelivered(dataArray,endDateMs)){
                                   metrics.unplannedDelivered += this.getDeliveredMetric(dataArray,usePoints);
                               }
                           }        
                       }, this);
                        return metrics; 
                   },
                   isIncluded: function(dataArray,excludeAcceptedBeforeStart,minDuration,startDateMs,endDateMs){
                    if (excludeAcceptedBeforeStart){
                            if (this.getDeliveredDate(dataArray) && this.getDeliveredDate(dataArray) < startDateMs){
                                return false;  
                            }
                       }
                       if (minDuration > 0){
                            var firstDate = Math.max(this.getFirstDate(dataArray), startDateMs),
                            lastDate = Math.min(this.getLastDate(dataArray),endDateMs);
                            return (lastDate - firstDate) > minDuration; 
                       }
                       return true;  
                   },
                   getPlannedMetric: function(dataArray,usePoints){
                       if (usePoints){
                            //return dataArray[0][TimeboxCacheModelBuilder.PLANNED_POINTS_IDX] || 0;
                            return dataArray[TimeboxCacheModelBuilder.PLANNED_POINTS_IDX] || 0;
                        }
                        return 1; 
                   },
                   getDeliveredMetric: function(dataArray, usePoints){
                       if (usePoints){
                            return dataArray[TimeboxCacheModelBuilder.DELIVERED_POINTS_IDX] || 0;
                            //return dataArray[dataArray.length-1][TimeboxCacheModelBuilder.POINTS_IDX] || 0;
                       }
                       return 1; 
                   },
                   getFirstDate: function(dataArray){
                       return dataArray[TimeboxCacheModelBuilder.VALID_FROM_IDX];
                   },
                   getLastDate: function(dataArray){
                       return dataArray[TimeboxCacheModelBuilder.VALID_TO_IDX];
                   },
                   getDeliveredDate: function(dataArray){
                       return dataArray[TimeboxCacheModelBuilder.DELIVERED_IDX] || null;
                   },
                    isDataUnplanned: function(dataArray,planningDateMs){
                        return this.getFirstDate(dataArray) > planningDateMs;
                    },
                    isDataPlanned: function(dataArray,planningDateMs){
                        return this.getFirstDate(dataArray) < planningDateMs && this.getLastDate(dataArray) > planningDateMs;
                    },
                    isDataDelivered: function(dataArray,endDateMs){
                        return this.getDeliveredDate(dataArray) && this.getDeliveredDate(dataArray) <= endDateMs && this.getLastDate(dataArray) > endDateMs;
                    },
                    getFormattedID: function(dataArray){
                        return dataArray[TimeboxCacheModelBuilder.FID_IDX];
                    },
                    getSnapCount: function(dataArray){
                        return dataArray[TimeboxCacheModelBuilder.COUNT_IDX];
                    },
                    getCacheDataForExport: function(planningWindowShiftInDays, minDurationInHours,excludeAcceptedBeforeStart,context){
                        var cache = this.getCacheObject(),
                            startDateMs = this.getStartDateMs(),
                            endDateMs = this.getEndDateMs(),
                            planningDateMs = startDateMs + 86400000 * planningWindowShiftInDays,
                            minDuration = minDurationInHours * 3600000; 
                
                        return _.map(cache.data, function(o,oid){
                            var validTo = new Date(this.getLastDate(o)); 
                            if (validTo > new Date()){
                                validTo = new Date();  
                            }
                            
                            return {
                                ObjectID: oid,
                                FormattedID: this.getFormattedID(o),
                                ValidFrom: Rally.util.DateTime.formatWithDefaultDateTime(new Date(this.getFirstDate(o)),context),
                                ValidTo: Rally.util.DateTime.formatWithDefaultDateTime(validTo,context),
                                DeliveredDate: this.getDeliveredDate(o) ? Rally.util.DateTime.formatWithDefaultDateTime(new Date(this.getDeliveredDate(o))) : "",
                                SnapCount: this.getSnapCount(o),
                                TimeboxName: this.get('Name'),
                                Project: this.get('Project').Name,
                                StartDate: Rally.util.DateTime.formatWithDefaultDateTime(new Date(startDateMs),context),
                                EndDate: Rally.util.DateTime.formatWithDefaultDateTime(new Date(endDateMs),context),
                                PlannedPoints: o[TimeboxCacheModelBuilder.PLANNED_POINTS_IDX] || 0,
                                DeliveredPoints: o[TimeboxCacheModelBuilder.DELIVERED_POINTS_IDX] || 0,
                                Delivered: this.isDataDelivered(o,endDateMs),
                                Planned: this.isDataPlanned(o,planningDateMs),
                                Included: this.isIncluded(o,excludeAcceptedBeforeStart,minDuration,startDateMs,endDateMs),
                                PlanningDate: Rally.util.DateTime.formatWithDefaultDateTime(new Date(planningDateMs),context),
                            }
                        },this);
                    }
                });
                deferred.resolve(new_model);
            }
        });
        return deferred;
    }
});