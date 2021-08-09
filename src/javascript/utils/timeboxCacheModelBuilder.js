Ext.define('TimeboxCacheMixin',{

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
        console.log('checksum ',chk);
        return chk;
    },
    isCacheValid: function(){
        var cache = this.getCacheObject();
        return cache && cache.checksum === this.getChecksum() || false;
    },
    buildCacheFromSnaps: function(snapArraysByOid,deliveredDateField){
        var checksum = this.getChecksum(),
            cache = {
                checksum: checksum,
                data: {}
            };
        _.each(snapArraysByOid, function(snapArray,snapOid){
            var snaps = _.sortBy(snapArray, ["_ValidFrom"]);
            var firstDayInRange = snaps[0]._ValidFrom,
                lastSnap = snaps[snaps.length - 1],
                lastDayInRange = lastSnap._ValidTo,
                deliveredDate = lastSnap[deliveredDateField] || null;

            var cacheArray = [];
            cacheArray[TimeboxCacheModelBuilder.VALID_FROM_IDX] = Date.parse(firstDayInRange);
            cacheArray[TimeboxCacheModelBuilder.VALID_TO_IDX] = Date.parse(lastDayInRange);
            cacheArray[TimeboxCacheModelBuilder.DELIVERED_IDX] = deliveredDate && Date.parse(deliveredDate),
            cacheArray[TimeboxCacheModelBuilder.COUNT_IDX] = snaps.length; //Should be < 100 chars 
            cacheArray[TimeboxCacheModelBuilder.FID_IDX] = snaps[0].FormattedID; 
            cache.data[snapOid] = cacheArray; 
            console.log('cache.data ', this.get('Name'),cache.data);
        }, this);

        //NOTE: todo -- If the length of the cached data is > limit, we cannot save it to cache and it will always need to be
        //reloaded
        this.set(this.historicalCacheField,cache);
    },
    getCacheObject: function(){
        var cache = this.get(this.historicalCacheField) || null;
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
    getPlannedDeliveredMetrics: function(planningWindowShiftInDays){
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
            planningDateMs = startDateMs + 86400000 * planningWindowShiftInDays;  
        console.log('cache',cache)
        console.log('cache ', this.historicalCacheField)

        _.each(cache.data, function(dataArray, oid){
            if (this.isDataPlanned(dataArray, planningDateMs)){
                metrics.planned++;
                if (this.isDataDelivered(dataArray,endDateMs)){
                    metrics.plannedDelivered++;
                }
            }
            if (this.isDataUnplanned(dataArray,planningDateMs)){
                metrics.unplanned++;
                if (this.isDataDelivered(dataArray,endDateMs)){
                    metrics.unplannedDelivered++;
                }
            }
            
            // if (dataArray[this.DELIVERED_IDX] < startDateMs){
            //     metrics.acceptedBeforeStart++;
            // }
        }, this);
         return metrics; 
    },
    isDataUnplanned: function(dataArray,planningDateMs){
        return dataArray[TimeboxCacheModelBuilder.VALID_FROM_IDX] > planningDateMs;
    },
    isDataPlanned: function(dataArray,planningDateMs){
        return dataArray[TimeboxCacheModelBuilder.VALID_FROM_IDX] < planningDateMs && dataArray[TimeboxCacheModelBuilder.VALID_TO_IDX] > planningDateMs;
    },
    isDataDelivered: function(dataArray,endDateMs){
        return dataArray[TimeboxCacheModelBuilder.DELIVERED_IDX] && dataArray[TimeboxCacheModelBuilder.VALID_TO_IDX] > endDateMs;
    },
    getCacheDataForExport: function(planningWindowShiftInDays){
        var cache = this.getCacheObject(),
            startDateMs = this.getStartDateMs(),
            endDateMs = this.getEndDateMs(),
            planningDateMs = startDateMs + 86400000 * planningWindowShiftInDays;  

        return _.map(cache.data, function(o,oid){
            console.log('o',o);
            console.log(Rally.util.DateTime.toIsoString(new Date(o[TimeboxCacheModelBuilder.VALID_FROM_IDX])))
            return {
                ObjectID: oid,
                FormattedID: o[TimeboxCacheModelBuilder.FID_IDX],
                ValidFrom: Rally.util.DateTime.toIsoString(new Date(o[TimeboxCacheModelBuilder.VALID_FROM_IDX])),
                ValidTo: Rally.util.DateTime.toIsoString(new Date(o[TimeboxCacheModelBuilder.VALID_TO_IDX])),
                DeliveredDate: o[TimeboxCacheModelBuilder.DELIVERED_IDX] ? Rally.util.DateTime.toIsoString(new Date(o[TimeboxCacheModelBuilder.DELIVERED_IDX])) : "",
                SnapCount: o[TimeboxCacheModelBuilder.COUNT_IDX],
                TimeboxName: this.get('Name'),
                Project: this.get('Project').Name,
                StartDate: Rally.util.DateTime.toIsoString(new Date(startDateMs)),
                EndDate: Rally.util.DateTime.toIsoString(new Date(endDateMs)),
                Delivered: this.isDataDelivered(o,endDateMs),
                Planned: this.isDataPlanned(o,planningDateMs),
                PlanningDate: Rally.util.DateTime.toIsoString(new Date(planningDateMs))
            }
        },this);
    }
});


Ext.define('TimeboxCacheModelBuilder',{
    singleton: true,
    
    CACHE_VERSION: 2,
                    
    //Cache Indexes 
    VALID_FROM_IDX: 0,
    VALID_TO_IDX: 1,
    DELIVERED_IDX:  2,
    COUNT_IDX: 3,
    FID_IDX: 4, 

    VIRTUAL_CACHE_FIELD_NAME: "__unpersistedCache",
   
    getExportFieldsHash: function(){
        //coordinate this with getCacheDataForExport
        return {
            ObjectID: "Object ID",
            FormattedID: "Formatted ID",
            ValidFrom: "Added to Timebox on or Before",
            ValidTo: "Removed from Timebox on or After",
            DeliveredDate: "Accepted Date",
            SnapCount: "Snapshot Count for Timebox",
            TimeboxName: "Timebox",
            Project: "Project",
            StartDate: "Timebox Start Date",
            EndDate: "Timebox End Date",
            Delivered: "is Delivered in Timebox",
            Planned: "is Planned",
            PlanningDate: "Planning Date Cutoff"
        };
    },
    build: function(modelType,newModelName,historicalCacheFieldName,timeboxStartDateField,timeboxEndDateField) {
        var deferred = Ext.create('Deft.Deferred');
        console.log('before model built', newModelName,historicalCacheFieldName,timeboxStartDateField,timeboxEndDateField);
        Rally.data.ModelFactory.getModel({
            type: modelType,
            success: function(model) {
                console.log('model built', model);
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
                    mixins: ['TimeboxCacheMixin'],
                    
                    timeboxStartDateField: timeboxStartDateField,
                    timeboxEndDateField: timeboxEndDateField,
                    historicalCacheField: historicalCacheFieldName,
                    fields: default_fields
                });
                deferred.resolve(new_model);
            }
        });
        return deferred;
    }
});