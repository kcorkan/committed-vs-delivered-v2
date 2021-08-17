describe("HistoricalCacheStore ... ", function(){
    var timeboxModel;
    var ready_to_test;
    var flag;
    var cacheFactory;
    
    beforeEach(function(done) {
        TimeboxCacheModelBuilder.build('Iteration','Iteration_x',null,'StartDate','EndDate').then({
            success: function(model){
                timeboxModel = model;
                done();
            }
        });
        cacheFactory = Ext.create('TimeboxHistoricalCacheFactory',{
            dataContext: null,
            timeboxType: "Iteration",
            dataContext: null,
            modelNames: [],
            saveCacheToTimebox: false,
            pointsField: 'PlanEstimate',
            deliveredDateField: 'AcceptedDate'
         });
    });

    it("should calculate first date, last date and delivered date properly", function(){
        var startDate = acceptedBeforeStartData.timeboxStartDate,
        endDate =acceptedBeforeStartData.timeboxEndDate;

        var timeboxes = buildTimeboxes_simple(timeboxModel, startDate, endDate,1,acceptedBeforeStartData.timeboxOidStart);
        
        var snaps = buildSnapsDataSet(acceptedBeforeStartData.snaps);
        
        var tbName = timeboxes[0].get('Name');
    
        var timeboxGroup = cacheFactory.groupTimeboxes(timeboxes);
        cacheFactory.processSnapshots(snaps,timeboxGroup[tbName]);

        var cacheObject = timeboxes[0].getCacheObject(),
            cacheData = cacheObject.data[snaps[0].get('ObjectID')];

        expect(timeboxes[0].getFirstDate(cacheData)).toEqual(Date.parse(snaps[1].get('_ValidFrom'))); 
        expect(timeboxes[0].getLastDate(cacheData)).toEqual(Date.parse(snaps[snaps.length-1].get('_ValidTo'))); 
        expect(timeboxes[0].getDeliveredDate(cacheData)).toEqual(Date.parse(snaps[snaps.length-1].get('AcceptedDate'))) 
          
    });

    //added: [10,3,2,1,1,2]
    //delivered:  [9,3,1,0,1,1]
    it("should not calculate planned and delivered based on the cache",function(){
 
        var startDate = "2020-06-04T00:00:00Z",
            endDate = "2020-06-11T23:59:59Z",
            planningWindowShiftInDays = 1,
            minDurationInHours = 0,
            excludeAcceptedBeforeStart = false,
            usePoints = false;

        var timeboxes = buildTimeboxes_simple(timeboxModel, startDate, endDate,1);
        
        var snaps = buildDatasetOfSnapsForAnOid_simple();
         
        var tbOid = timeboxes[0].get('ObjectID'),
            tbName = timeboxes[0].get('Name');
     
        var timeboxGroup = cacheFactory.groupTimeboxes(timeboxes);
        cacheFactory.processSnapshots(snaps,timeboxGroup[tbName]);
           
        var metrics = timeboxes[0].getPlannedDeliveredMetrics(planningWindowShiftInDays, minDurationInHours,excludeAcceptedBeforeStart,usePoints);
        expect (metrics.planned).toEqual(1);
        expect (metrics.unplannedDelivered).toEqual(0);
        expect (metrics.plannedDelivered).toEqual(1);
        expect (metrics.unplanned).toEqual(0);
        expect (metrics.acceptedBeforeStart).toEqual(0);

        var metrics = timeboxes[0].getPlannedDeliveredMetrics(planningWindowShiftInDays, minDurationInHours,excludeAcceptedBeforeStart,true);
        expect (metrics.planned).toEqual(3);
        expect (metrics.unplannedDelivered).toEqual(0);
        expect (metrics.plannedDelivered).toEqual(3);
        expect (metrics.unplanned).toEqual(0);
        expect (metrics.acceptedBeforeStart).toEqual(0);

    });
    
    it("should not count items accepted before the sprint if the excludeAcceptedBeforeSprint flag is on",function(){
 
        var startDate = acceptedBeforeStartData.timeboxStartDate,
            endDate =acceptedBeforeStartData.timeboxEndDate,
            planningWindowShiftInDays = 1,
            minDurationInHours = 0,
            excludeAcceptedBeforeStart = false,
            usePoints = false;

        var timeboxes = buildTimeboxes_simple(timeboxModel, startDate, endDate,1,acceptedBeforeStartData.timeboxOidStart);
        
        var snaps = buildSnapsDataSet(acceptedBeforeStartData.snaps);
         
        var tbOid = timeboxes[0].get('ObjectID'),
            tbName = timeboxes[0].get('Name');
     
        var timeboxGroup = cacheFactory.groupTimeboxes(timeboxes);
        cacheFactory.processSnapshots(snaps,timeboxGroup[tbName]);

        var cacheObject = timeboxes[0].getCacheObject();
        
        excludeAcceptedBeforeStart = false; 
        usePoints = false;
        var metrics = timeboxes[0].getPlannedDeliveredMetrics(planningWindowShiftInDays, minDurationInHours,excludeAcceptedBeforeStart,usePoints);
        expect (metrics.planned).toEqual(1);
        expect (metrics.unplannedDelivered).toEqual(0);
        expect (metrics.plannedDelivered).toEqual(1);
        expect (metrics.unplanned).toEqual(0);
        expect (metrics.acceptedBeforeStart).toEqual(0);

        excludeAcceptedBeforeStart = true; 
        usePoints = false;
        var metrics = timeboxes[0].getPlannedDeliveredMetrics(planningWindowShiftInDays, minDurationInHours,excludeAcceptedBeforeStart,usePoints);
        expect (metrics.planned).toEqual(0);
        expect (metrics.unplannedDelivered).toEqual(0);
        expect (metrics.plannedDelivered).toEqual(0);
        expect (metrics.unplanned).toEqual(0);
        expect (metrics.acceptedBeforeStart).toEqual(0);
    });

    it("should not count items that have existed in the sprint for less than a configured duration of time",function(){
 
        var startDate = durationData1DayInside.timeboxStartDate,
            endDate =durationData1DayInside.timeboxEndDate,
            planningWindowShiftInDays = 1,
            minDurationInHours = 0,
            excludeAcceptedBeforeStart = false,
            usePoints = false;

        var timeboxes = buildTimeboxes_simple(timeboxModel, startDate, endDate,1,durationData1DayInside.timeboxOidStart);
        
        var snaps = buildSnapsDataSet(durationData1DayInside.snaps);
         
        var tbOid = timeboxes[0].get('ObjectID'),
            tbName = timeboxes[0].get('Name');
     
        var timeboxGroup = cacheFactory.groupTimeboxes(timeboxes);
        cacheFactory.processSnapshots(snaps,timeboxGroup[tbName]);

        excludeAcceptedBeforeStart = false; 
        usePoints = false;
        minDurationInHours = 24;
        var metrics = timeboxes[0].getPlannedDeliveredMetrics(planningWindowShiftInDays, minDurationInHours,excludeAcceptedBeforeStart,usePoints);
        expect (metrics.planned).toEqual(0);
        expect (metrics.unplannedDelivered).toEqual(0);
        expect (metrics.plannedDelivered).toEqual(0);
        expect (metrics.unplanned).toEqual(0);
    });

    it ("should count items in the timebox beyond the minDuration",function(){

        var startDate = durationData1DayInside.timeboxStartDate,
            endDate =durationData1DayInside.timeboxEndDate,
            planningWindowShiftInDays = 1,
            minDurationInHours = 0,
            excludeAcceptedBeforeStart = false,
            usePoints = false;

        var timeboxes = buildTimeboxes_simple(timeboxModel, startDate, endDate,1,durationData1DayInside.timeboxOidStart);
        
        var snaps = buildSnapsDataSet(durationData1DayInside.snaps);
         
        var tbOid = timeboxes[0].get('ObjectID'),
            tbName = timeboxes[0].get('Name');
     
        var timeboxGroup = cacheFactory.groupTimeboxes(timeboxes);
        cacheFactory.processSnapshots(snaps,timeboxGroup[tbName]);
        
        excludeAcceptedBeforeStart = false; 
        usePoints = false;
        minDurationInHours = 4;
        var metrics = timeboxes[0].getPlannedDeliveredMetrics(planningWindowShiftInDays, minDurationInHours,excludeAcceptedBeforeStart,usePoints);
        expect (metrics.planned).toEqual(0);
        expect (metrics.unplannedDelivered).toEqual(0);
        expect (metrics.plannedDelivered).toEqual(0);
        expect (metrics.unplanned).toEqual(1);

    });


    it ("if the item is in the timebox over the end date, then it hsould not count items added to the iteration less than the min duration before the end date",function(){

        var startDate = durationData1DayEnd.timeboxStartDate,
            endDate =durationData1DayEnd.timeboxEndDate,
            planningWindowShiftInDays = 1,
            minDurationInHours = 0,
            excludeAcceptedBeforeStart = false,
            usePoints = false;

        var timeboxes = buildTimeboxes_simple(timeboxModel, startDate, endDate,1,durationData1DayEnd.timeboxOidStart);
        
        var snaps = buildSnapsDataSet(durationData1DayEnd.snaps);
         
        var tbOid = timeboxes[0].get('ObjectID'),
            tbName = timeboxes[0].get('Name');
     
        var timeboxGroup = cacheFactory.groupTimeboxes(timeboxes);
        cacheFactory.processSnapshots(snaps,timeboxGroup[tbName]);
        
        excludeAcceptedBeforeStart = false; 
        usePoints = false;
        minDurationInHours = 24;
        var metrics = timeboxes[0].getPlannedDeliveredMetrics(planningWindowShiftInDays, minDurationInHours,excludeAcceptedBeforeStart,usePoints);
        expect (metrics.planned).toEqual(0);
        expect (metrics.unplannedDelivered).toEqual(0);
        expect (metrics.plannedDelivered).toEqual(0);
        expect (metrics.unplanned).toEqual(0);

    });
    it ("if the item is in the timebox over the end date, then it should count items added to the iteration beyond the min duration before the end date",function(){

        var startDate = durationData1DayEnd.timeboxStartDate,
            endDate =durationData1DayEnd.timeboxEndDate,
            planningWindowShiftInDays = 1,
            minDurationInHours = 0,
            excludeAcceptedBeforeStart = false,
            usePoints = false;

        var timeboxes = buildTimeboxes_simple(timeboxModel, startDate, endDate,1,durationData1DayEnd.timeboxOidStart);
        
        var snaps = buildSnapsDataSet(durationData1DayEnd.snaps);
         
        var tbOid = timeboxes[0].get('ObjectID'),
            tbName = timeboxes[0].get('Name');
     
        var timeboxGroup = cacheFactory.groupTimeboxes(timeboxes);
        cacheFactory.processSnapshots(snaps,timeboxGroup[tbName]);
        
        excludeAcceptedBeforeStart = false; 
        usePoints = false;
        minDurationInHours = 22;
        var metrics = timeboxes[0].getPlannedDeliveredMetrics(planningWindowShiftInDays, minDurationInHours,excludeAcceptedBeforeStart,usePoints);
        expect (metrics.planned).toEqual(0);
        expect (metrics.unplannedDelivered).toEqual(1);
        expect (metrics.plannedDelivered).toEqual(0);
        expect (metrics.unplanned).toEqual(1);

    });
    it ("should not count work items accepted after the timebox as delivered and it should count work items accepted after the timebox endDate in the planned/unplanned count for the timebox if they were in the timebox more than the minDuration", function(){
        var startDate = acceptedAfterTimebox.timeboxStartDate,
        endDate =acceptedAfterTimebox.timeboxEndDate,
        planningWindowShiftInDays = 1,
        minDurationInHours = 0,
        excludeAcceptedBeforeStart = false,
        usePoints = false;

        var timeboxes = buildTimeboxes_simple(timeboxModel, startDate, endDate,1,acceptedAfterTimebox.timeboxOidStart);
        
        var snaps = buildSnapsDataSet(acceptedAfterTimebox.snaps);
        
        var tbOid = timeboxes[0].get('ObjectID'),
            tbName = timeboxes[0].get('Name');
    
        var timeboxGroup = cacheFactory.groupTimeboxes(timeboxes);
        cacheFactory.processSnapshots(snaps,timeboxGroup[tbName]);
        
        excludeAcceptedBeforeStart = false; 
        usePoints = false;
        minDurationInHours = 22;
        var metrics = timeboxes[0].getPlannedDeliveredMetrics(planningWindowShiftInDays, minDurationInHours,excludeAcceptedBeforeStart,usePoints);
        expect (metrics.planned).toEqual(1);
        expect (metrics.unplannedDelivered).toEqual(0);
        expect (metrics.plannedDelivered).toEqual(0);
        expect (metrics.unplanned).toEqual(0);
    });
    it ("should count unplanned/planned points when they were added to the timebox and count the delivered points at the end of the timebox", function(){
        var startDate = changingPoints.timeboxStartDate,
        endDate =changingPoints.timeboxEndDate,
        planningWindowShiftInDays = 1,
        minDurationInHours = 0,
        excludeAcceptedBeforeStart = false,
        usePoints = false;

        var timeboxes = buildTimeboxes_simple(timeboxModel, startDate, endDate,1,changingPoints.timeboxOidStart);
        
        var snaps = buildSnapsDataSet(changingPoints.snaps);
        
        var tbOid = timeboxes[0].get('ObjectID'),
            tbName = timeboxes[0].get('Name');
    
        var timeboxGroup = cacheFactory.groupTimeboxes(timeboxes);
        cacheFactory.processSnapshots(snaps,timeboxGroup[tbName]);
        
        excludeAcceptedBeforeStart = false; 
        usePoints = true;
        minDurationInHours = 0;
        var metrics = timeboxes[0].getPlannedDeliveredMetrics(planningWindowShiftInDays, minDurationInHours,excludeAcceptedBeforeStart,usePoints);
        expect (metrics.planned).toEqual(10);
        expect (metrics.unplannedDelivered).toEqual(0);
        expect (metrics.plannedDelivered).toEqual(13);
        expect (metrics.unplanned).toEqual(0);
    });
    it ("should count missing points as 0", function(){
        var startDate = missingPoints.timeboxStartDate,
        endDate =missingPoints.timeboxEndDate,
        planningWindowShiftInDays = 1,
        minDurationInHours = 0,
        excludeAcceptedBeforeStart = false,
        usePoints = false;

        var timeboxes = buildTimeboxes_simple(timeboxModel, startDate, endDate,1,missingPoints.timeboxOidStart);
        
        var snaps = buildSnapsDataSet(missingPoints.snaps);
        
        var tbOid = timeboxes[0].get('ObjectID'),
            tbName = timeboxes[0].get('Name');
    
        var timeboxGroup = cacheFactory.groupTimeboxes(timeboxes);
        cacheFactory.processSnapshots(snaps,timeboxGroup[tbName]);
        
        excludeAcceptedBeforeStart = false; 
        usePoints = true;
        minDurationInHours = 0;
        var metrics = timeboxes[0].getPlannedDeliveredMetrics(planningWindowShiftInDays, minDurationInHours,excludeAcceptedBeforeStart,usePoints);
        expect (metrics.planned).toEqual(8);
        expect (metrics.unplannedDelivered).toEqual(0);
        expect (metrics.plannedDelivered).toEqual(13);
        expect (metrics.unplanned).toEqual(0);
    });
    it ("should count an item moved between sprints and back in both sprints if they were in each for the minDuration.  It should show delivered in the sprint the item was delivered in", function(){
        var startDate = movedItems.timeboxStartDate,
        endDate =movedItems.timeboxEndDate,
        planningWindowShiftInDays = 1,
        minDurationInHours = 0,
        excludeAcceptedBeforeStart = false,
        usePoints = false;

        var timeboxes = buildTimeboxes_simple(timeboxModel, startDate, endDate,2,movedItems.timeboxOidStart);
        var snaps = buildSnapsDataSet(movedItems.snaps);
        
        var tbOid = timeboxes[0].get('ObjectID'),
            tbName = timeboxes[0].get('Name');
    
        var timeboxGroup = cacheFactory.groupTimeboxes(timeboxes);
        cacheFactory.processSnapshots(snaps,timeboxGroup[tbName]);
        
        excludeAcceptedBeforeStart = false; 
        usePoints = true;
        minDurationInHours = 0;
        var metrics = timeboxes[0].getPlannedDeliveredMetrics(planningWindowShiftInDays, minDurationInHours,excludeAcceptedBeforeStart,usePoints);
        expect (metrics.planned).toEqual(5);
        expect (metrics.unplannedDelivered).toEqual(0);
        expect (metrics.plannedDelivered).toEqual(5);
        expect (metrics.unplanned).toEqual(0);

        var metrics = timeboxes[1].getPlannedDeliveredMetrics(planningWindowShiftInDays, minDurationInHours,excludeAcceptedBeforeStart,usePoints);
        expect (metrics.planned).toEqual(0);
        expect (metrics.unplannedDelivered).toEqual(0);
        expect (metrics.plannedDelivered).toEqual(0);
        expect (metrics.unplanned).toEqual(5);
    });

    it ("should filter out items in iterations before the start date", function(){
        var startDate = itemInSprintBeforeStart.timeboxStartDate,
        endDate =itemInSprintBeforeStart.timeboxEndDate,
        planningWindowShiftInDays = 1,
        minDurationInHours = 0,
        excludeAcceptedBeforeStart = false,
        usePoints = false;

        var timeboxes = buildTimeboxes_simple(timeboxModel, startDate, endDate,1,itemInSprintBeforeStart.timeboxOidStart);
        var snaps = buildSnapsDataSet(itemInSprintBeforeStart.snaps);
        
        var tbOid = timeboxes[0].get('ObjectID'),
            tbName = timeboxes[0].get('Name');
    
        var timeboxGroup = cacheFactory.groupTimeboxes(timeboxes);
        cacheFactory.processSnapshots(snaps,timeboxGroup[tbName]);
        
        excludeAcceptedBeforeStart = false; 
        usePoints = true;
        minDurationInHours = 0;
        var metrics = timeboxes[0].getPlannedDeliveredMetrics(planningWindowShiftInDays, minDurationInHours,excludeAcceptedBeforeStart,usePoints);
        expect (metrics.planned).toEqual(0);
        expect (metrics.unplannedDelivered).toEqual(0);
        expect (metrics.plannedDelivered).toEqual(0);
        expect (metrics.unplanned).toEqual(0);

    });

    it('should render the app', function() {
        var app = Rally.test.Harness.launchApp("Rally.app.CommittedvsDeliveredv2");
        expect(app.getEl()).toBeDefined();
    });
});