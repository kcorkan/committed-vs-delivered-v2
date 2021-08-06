describe("HistoricalCacheStore ... ", function(){
    var model;
    var ready_to_test;
    var flag;
    
    //added: [10,3,2,1,1,2]
    //delivered:  [9,3,1,0,1,1]
    it("should create a cache for a timebox group",function(){
        
        var startDate = "2020-06-04T00:00:00Z",
            endDate = "2020-06-11T23:59:59Z";
      
        var snaps = buildDatasetOfSnapsForAnOid_simple();
        var timeboxes = buildTimeboxes_simple(startDate,endDate,1);
        
        var cacheFactory = Ext.create('TimeboxHistoricalCacheFactory',{
            dataContext: null,
            timeboxType: "Iteration",
            dataContext: null,
            timeboxType: null,
            modelNames: [],
            saveCacheToTimebox: false
         });
      
        var tbOid = timeboxes[0].get('ObjectID'),
            tbName = timeboxes[0].get('Name');

        var timeboxGroup = cacheFactory.groupTimeboxes(timeboxes);
        cacheFactory.processSnapshots(snaps,timeboxGroup[tbName]);

        var cache = timeboxes[0].getCacheObject();
        console.log(JSON.stringify(cache));
        expect(timeboxes[0]).toEqual(startDate);
        expect(cache[tbOid].endDate).toEqual(endDate);
        expect(cache[tbOid].countAdded[0]).toEqual(1);
        expect(cache[tbOid].countDeliveredByAdded[0]).toEqual(1);
        expect(cache[tbOid].countAdded[1]).toEqual(0);
        expect(cache[tbOid].countDeliveredByAdded[1]).toEqual(0);

    });
    


    // it("should create a cache for a timebox group 521511480168",function(){
        
    //     var startDate = "2021-07-05T06:00:00Z",
    //     endDate = "2021-07-19T05:59:59Z";
      
    //     var snaps = buildDatasetFromRealData("Stories_Iteration_521511480168");
    //     var timeboxes = [buildTimebox(startDate,endDate,521511480168)];
        
    //     var cacheFactory = Ext.create('TimeboxHistoricalCacheFactory',{
    //         timeboxes: timeboxes,
    //         dataContext: null,
    //         timeboxType: "Iteration",
    //         historicalCacheField: null,
    //         modelNames: [],
    //         planningWindow: 0,
    //         timeboxEndDateField: "EndDate",
    //         timeboxStartDateField: "StartDate"     
    //     });
      
    //     var tbOid = timeboxes[0].get('ObjectID'),
    //         tbName = timeboxes[0].get('Name');

    //     var timeboxGroup = cacheFactory.groupTimeboxes(timeboxes);
    //     var cache = cacheFactory.processSnapshots(snaps,timeboxGroup[tbName]);

    //     console.log(JSON.stringify(cache));

    //     expect(cache[tbOid].startDate).toEqual(startDate);
    //     expect(cache[tbOid].endDate).toEqual(endDate);
    //     expect(cache[tbOid].countAdded[0]).toEqual(1);
    //     expect(cache[tbOid].countDeliveredByAdded[0]).toEqual(1);
    //     expect(cache[tbOid].countAdded[1]).toEqual(0);
    //     expect(cache[tbOid].countDeliveredByAdded[1]).toEqual(0);

    // });

    // it ('should calculate the dayInTimebox accurately', function(){
    //     var cacheFactory = Ext.create('TimeboxHistoricalCacheFactory',{});

    //     var startDateMs = Date.parse("2020-06-04T00:00:00Z"),
    //         endDateMs = Date.parse("2020-06-11T23:59:59Z");
    //     var dayString = "2020-06-01T00:00:00Z";
        
    //     var dayInTimebox = cacheFactory.getDayInTimebox(dayString,startDateMs,endDateMs);
    //     expect(dayInTimebox).toEqual(0);

    //     var dayString = "2020-06-04T00:00:00Z";
    //     var dayInTimebox = cacheFactory.getDayInTimebox(dayString,startDateMs,endDateMs);
    //     expect(dayInTimebox).toEqual(1);

    //     var dayString = "2020-06-05T00:00:00Z";
    //     var dayInTimebox = cacheFactory.getDayInTimebox(dayString,startDateMs,endDateMs);
    //     expect(dayInTimebox).toEqual(2);

    //     var dayString = "2020-06-06T00:00:00Z";
    //     var dayInTimebox = cacheFactory.getDayInTimebox(dayString,startDateMs,endDateMs);
    //     expect(dayInTimebox).toEqual(3);

    //     var dayString = "2020-06-07T00:00:00Z";
    //     var dayInTimebox = cacheFactory.getDayInTimebox(dayString,startDateMs,endDateMs);
    //     expect(dayInTimebox).toEqual(4);
        
    //     var dayString = "2020-06-08T00:00:00Z";
    //     var dayInTimebox = cacheFactory.getDayInTimebox(dayString,startDateMs,endDateMs);
    //     expect(dayInTimebox).toEqual(5);

    //     var dayString = "2020-06-09T00:00:00Z";
    //     var dayInTimebox = cacheFactory.getDayInTimebox(dayString,startDateMs,endDateMs);
    //     expect(dayInTimebox).toEqual(6);

    //     var dayString = "2020-06-10T00:00:00Z";
    //     var dayInTimebox = cacheFactory.getDayInTimebox(dayString,startDateMs,endDateMs);
    //     expect(dayInTimebox).toEqual(7);

    //     var dayString = "2020-06-11T00:00:00Z";
    //     var dayInTimebox = cacheFactory.getDayInTimebox(dayString,startDateMs,endDateMs);
    //     expect(dayInTimebox).toEqual(8);

    //     var dayString = "2020-06-11T23:59:59Z";
    //     var dayInTimebox = cacheFactory.getDayInTimebox(dayString,startDateMs,endDateMs);
    //     expect(dayInTimebox).toEqual(8);

    //     var dayString = "2020-06-12T00:00:00Z";
    //     var dayInTimebox = cacheFactory.getDayInTimebox(dayString,startDateMs,endDateMs);
    //     expect(dayInTimebox).toEqual(-1);
    // });

    // it ('should initialize the cache properly based on the days in the timebox', function(){
    //     var cacheFactory = Ext.create('TimeboxHistoricalCacheFactory',{});
    //     var startDate = "2020-06-04T00:00:00Z",
    //     endDate = "2020-06-11T23:59:59Z";

    //     var cache = cacheFactory.initializeCache(startDate,endDate);
    //     expect(cache.startDate).toEqual(startDate);
    //     expect(cache.endDate).toEqual(endDate);
    //     expect(cache.countAdded.length).toEqual(9);
    //     expect(cache.countDeliveredByAdded).toEqual(cache.countAdded);
    //     expect(cache.countAdded[8]).toEqual(0);
    // });

    //     it ('should initialize the cache properly based on the days in the timebox', function(){
    //     var cacheFactory = Ext.create('TimeboxHistoricalCacheFactory',{});
    //     var startDate = "2020-06-04T00:00:00Z",
    //     endDate = "2020-06-11T23:59:59Z";

    //     var cache = cacheFactory.initializeCache(startDate,endDate);
    //     expect(cache.startDate).toEqual(startDate);
    //     expect(cache.endDate).toEqual(endDate);
    //     expect(cache.countAdded.length).toEqual(9);
    //     expect(cache.countDeliveredByAdded).toEqual(cache.countAdded);
    //     expect(cache.countAdded[8]).toEqual(0);
    // });

    it('should render the app', function() {
        var app = Rally.test.Harness.launchApp("Rally.app.CommittedvsDeliveredv2");
        expect(app.getEl()).toBeDefined();
    });
});