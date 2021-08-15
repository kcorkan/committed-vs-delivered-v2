Ext.define('TimeboxCacheModelBuilder',{
    singleton: true,
    
    CACHE_VERSION: 6,
                    
    //Cache Indexes 
    VALID_FROM_IDX: 0,
    VALID_TO_IDX: 1,
    DELIVERED_IDX:  2,
    POINTS_IDX: 3,
    FID_IDX: 4, 

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
            Delivered: "is Delivered in Timebox",
            Planned: "is Planned",
            Included: "is Included in Dataset",
            PlanningDate: "Planning Date Cutoff"
        };

        if (fields && fields.length > 0){
            for (var i=0; i< fields.length; i++){
                hash[fields[i]] = fields[i];
            }
        }
        return hash;
    },
    build: function(modelType,newModelName,historicalCacheFieldName,timeboxStartDateField,timeboxEndDateField) {
        var deferred = Ext.create('Deft.Deferred');
        Rally.data.ModelFactory.getModel({
            type: modelType,
            success: function(model) {
                var default_fields = []; 
                
                if (historicalCacheFieldName === null){
                    historicalCacheFieldName = TimeboxCacheModelBuilder.VIRTUAL_CACHE_FIELD_NAME;
                    default_fields.push({
                        name: historicalCacheFieldName,
                        defaultValue: null,
                        type: 'object'
                    });    
                }
                
                var new_model = Ext.define(newModelName, {
                    extend: model,
                    //mixins: ['TimeboxCacheMixin'],
                    timeboxStartDateField: timeboxStartDateField,
                    timeboxEndDateField: timeboxEndDateField,
                    historicalCacheField: historicalCacheFieldName,
                    fields: default_fields,
                    clearCache: function(){
                        this.set(this.historicalCacheField,null);
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
                    getChecksum: function(){
                        var startDate = this.getStartDateMs(),
                            endDate = this.getEndDateMs();
                            
                        var chk = 0x12345678,
                            string = Ext.String.format("{0}|{1}|{2}",TimeboxCacheModelBuilder.CACHE_VERSION,startDate,endDate);
                        
                        for (var i = 0; i < string.length; i++) {
                            chk += (string.charCodeAt(i) * i);
                        }
                        return chk;
                    },
                    isCacheValid: function(){
                        var cache = this.getCacheObject();
                        console.log('isCacheValid',JSON.stringify(cache));
                        console.log('isCacheValid checksum',cache.checksum,this.getChecksum());
                        console.log('isCacheValid',this.get('Project').Name);
                        
                        return cache && cache.checksum === this.getChecksum() || false;
                    },
                    buildCacheFromSnaps: function(snapArraysByOid,deliveredDateField,pointsField){
                        var checksum = this.getChecksum(),
                            cache = {
                                checksum: checksum,
                                data: {}
                            };
                        console.log('buildCacheFromSnaps',JSON.stringify(snapArraysByOid))
                        console.log('buildCacheFromSnaps',deliveredDateField)
                        console.log('buildCacheFromSnaps',pointsField)
                        console.log('buildCacheFromSnaps',this.get('Project').Name);
                        console.log('buildCacheFromSnaps',this.get('Name'));
                        _.each(snapArraysByOid, function(snapArray,snapOid){
                            var snaps = _.sortBy(snapArray, ["_ValidFrom"]);
                            var firstDayInRange = snaps[0]._ValidFrom,
                                lastSnap = snaps[snaps.length - 1],
                                lastDayInRange = lastSnap._ValidTo,
                                deliveredDate = lastSnap[deliveredDateField] || null;
                            var cacheData = [];
                            for (var i=0; i<snaps.length; i++){
                                var objArray = []; 
                                objArray[TimeboxCacheModelBuilder.VALID_FROM_IDX] = Date.parse(snaps[i]['_ValidFrom']);
                                objArray[TimeboxCacheModelBuilder.VALID_TO_IDX] = Date.parse(snaps[i]['_ValidTo']);
                                objArray[TimeboxCacheModelBuilder.DELIVERED_IDX] = Date.parse(snaps[i][deliveredDateField]);
                                objArray[TimeboxCacheModelBuilder.POINTS_IDX] = snaps[i][pointsField];
                                objArray[TimeboxCacheModelBuilder.FID_IDX] = snaps[i]['FormattedID'];
                                cacheData.push(objArray);                                
                            }    
                            cache.data[snapOid] = cacheData;
                        }, this);
                
                        //NOTE: todo -- If the length of the cached data is > limit, we cannot save it to cache and it will always need to be
                        //reloaded
                        var stringValue = JSON.stringify(cache);
                        console.log('buildCacheFromSnaps length',stringValue && stringValue.length);
                        this.set(this.historicalCacheField,stringValue);
                    },
                    getCacheObject: function(){
                        var cache = this.get(this.historicalCacheField) || null;
                        console.log('getCacheObject',cache, cache && cache.length);
                        if (typeof cache !== 'object' && cache !== null){
                            try {
                                cache = JSON.parse(cache);
                            } catch(ex){
                                cache = {}
                            }
                        }
                        if (cache && cache.checksum === this.getChecksum()){
                            return cache; 
                        }
                        return {};
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
                            return dataArray[0][TimeboxCacheModelBuilder.POINTS_IDX] || 0;

                        }
                        return 1; 
                   },
                   getDeliveredMetric: function(dataArray, usePoints){
                       if (usePoints){
                            return dataArray[dataArray.length-1][TimeboxCacheModelBuilder.POINTS_IDX] || 0;
                       }
                       return 1; 
                   },
                   getFirstDate: function(dataArray){
                       return dataArray[0][TimeboxCacheModelBuilder.VALID_FROM_IDX];
                   },
                   getLastDate: function(dataArray){
                       return dataArray[dataArray.length-1][TimeboxCacheModelBuilder.VALID_TO_IDX];
                   },
                   getDeliveredDate: function(dataArray){
                       return dataArray[dataArray.length-1][TimeboxCacheModelBuilder.DELIVERED_IDX] || null;
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
                        return dataArray[0][TimeboxCacheModelBuilder.FID_IDX];
                    },
                    getCacheDataForExport: function(planningWindowShiftInDays, minDurationInHours,excludeAcceptedBeforeStart){
                        var cache = this.getCacheObject(),
                            startDateMs = this.getStartDateMs(),
                            endDateMs = this.getEndDateMs(),
                            planningDateMs = startDateMs + 86400000 * planningWindowShiftInDays,
                            minDuration = minDurationInHours * 3600000; 
                
                        return _.map(cache.data, function(o,oid){
                            return {
                                ObjectID: oid,
                                FormattedID: this.getFormattedID(o),
                                ValidFrom: Rally.util.DateTime.toIsoString(new Date(this.getFirstDate(o))),
                                ValidTo: Rally.util.DateTime.toIsoString(new Date(this.getLastDate(o))),
                                DeliveredDate: this.getDeliveredDate(o) ? Rally.util.DateTime.toIsoString(new Date(this.getDeliveredDate(o))) : "",
                                SnapCount: o.length,
                                TimeboxName: this.get('Name'),
                                Project: this.get('Project').Name,
                                StartDate: Rally.util.DateTime.toIsoString(new Date(startDateMs)),
                                EndDate: Rally.util.DateTime.toIsoString(new Date(endDateMs)),
                                Delivered: this.isDataDelivered(o,endDateMs),
                                Planned: this.isDataPlanned(o,planningDateMs),
                                Included: this.isIncluded(o,excludeAcceptedBeforeStart,minDuration,startDateMs,endDateMs),
                                PlanningDate: Rally.util.DateTime.toIsoString(new Date(planningDateMs)),
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