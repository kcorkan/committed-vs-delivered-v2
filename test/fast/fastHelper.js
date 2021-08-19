var useObjectID = function(value,record) {
    if ( record.get('ObjectID') ) {
        return record.get('ObjectID');
    } 
    return 0;
};

var shiftDayBeginningToEnd = function(day) {
    return Rally.util.DateTime.add(Rally.util.DateTime.add(Rally.util.DateTime.add(day,'hour',23), 'minute',59),'second',59);
};

var buildSnapsDataSet = function(dataObjects){
    var snaps = [];
    for(var i=0; i<dataObjects.length; i++){
        snaps.push(Ext.create('mockStorySnapshot',{
            ObjectID: dataObjects[i].ObjectID,
            _ValidFrom: dataObjects[i]._ValidFrom,
            _ValidTo: dataObjects[i]._ValidTo,
            Iteration: dataObjects[i].Iteration,
            PlanEstimate: dataObjects[i].PlanEstimate,
            AcceptedDate: dataObjects[i].AcceptedDate,
            FormattedID: dataObjects[i].FormattedID

        }));
    }
    return snaps; 
};

var buildDatasetFromRealData = function(dataKey){
    if (!realData[dataKey]){
        return [];
    }

    var dataSet = [];
    for (var i=0; i < realData[dataKey].Results.length; i++){
        var res = realData[dataKey].Results[i];
        dataSet.push(Ext.create('mockStorySnapshot',{
            ObjectID: res.ObjectID,
            _ValidFrom: res._ValidFrom,
            _ValidTo: res._ValidTo,
            Iteration: res.Iteration,
            AcceptedDate: res.AcceptedDate,
            FormattedID: res.FormattedID 
        }));
    }
    return dataSet;  
};

var buildDatasetOfSnapsForAnOid_simple = function(){
    return [
        Ext.create('mockStorySnapshot',{
            ObjectID: 1,
            _ValidFrom: "2020-06-01T00:13:00Z",
            _ValidTo: "2020-06-06T00:14:00Z",
            Iteration: 100,
            PlanEstimate: 3
        }),
        Ext.create('mockStorySnapshot',{
            ObjectID: 1,
            _ValidFrom: "2020-06-06T00:14:00Z",
            _ValidTo: "2020-06-08T00:15:00Z",
            Iteration: 100,
            PlanEstimate: 3
        }),
        Ext.create('mockStorySnapshot',{
            ObjectID: 1,
            _ValidFrom: "2020-06-08T00:15:00Z",
            _ValidTo: "2020-06-12T00:15:00Z",
            Iteration: 100,
            AcceptedDate: "2020-06-08T00:00:00Z",
            PlanEstimate: 3

        })]
};

var buildTimebox = function(startDate,endDate,tbOid,index){
    index = index || 1;
    return Ext.create('mockTimebox',{
        StartDate: startDate,
        EndDate: endDate,
        Name: Ext.String.format("Timebox {0}", index),
        ObjectID: tbOid
    });
};
var buildTimeboxes_simple = function(model, startDate,endDate,count,tbOidStart){
    var timeboxes = [];
    var tbName = Ext.String.format("Iteration_{1}",startDate);
    if (!tbOidStart){ tbOidStart = 100; }
    for (var i=0; i<count; i++){
        var tbOid = i + tbOidStart;
        timeboxes.push(Ext.create(model,{
            StartDate: startDate,
            EndDate: endDate,
            Name: tbName,
            ObjectID: tbOid
        }));
    }
    return timeboxes;
};

Ext.define('mockTimebox',{
    extend: 'Ext.data.Model',
    fields: [
        {name:'ObjectID', type: 'int'},
        {name:'StartDate',type:'datetime'},
        {name:'EndDate',type:'datetime'},
        {name:'Name',type:'string'},
        {name: 'Project', type:'object'},
        {name:'id',type:'int',convert:useObjectID}
    ]
});

Ext.define('mockStorySnapshot',{
    extend: 'Ext.data.Model',
    fields: [
        {name:'ObjectID', type: 'int'},
        {name:'_ValidFrom',type:'auto'},
        {name:'_ValidTo',type:'auto'},
        {name:'Iteration',type: 'int', default: null},
        {name:'AcceptedDate',type:'auto', default: null},
        {name:'PlanEstimate',type:'int', default: null},
        {name:'FormattedID',type:'auto', default: null},
        {name:'id',type:'int',convert:useObjectID},
        {name:'_PreviousValues',type:'auto', default: null}
    ]
});

Ext.define('mockStory',{
    extend: 'Ext.data.Model',
    fields: [
        {name:'ObjectID', type: 'int'},
        {name:'Name',type:'string'},
        {name:'PlanEstimate',type:'int'},
        {name:'id',type:'int',convert:useObjectID},
        {name:'ScheduleState',type:'string',defaultValue:'Defined'}
    ]
});

