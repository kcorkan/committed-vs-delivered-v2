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


// var realData = {

//     Stories_Iteration_521511480168: {
//     "_rallyAPIMajor": "2",
//     "_rallyAPIMinor": "0",
//     "Errors": [],
//     "Warnings": [],
//     "GeneratedQuery": {
//         "find": {
//             "Iteration": 521511480168,
//             "_ValidFrom": {
//                 "$lte": "2021-07-19T05:59:59.000Z"
//             },
//             "_ValidTo": {
//                 "$gte": "2021-07-05T06:00:00.000Z"
//             },
//             "_TypeHierarchy": {
//                 "$in": [
//                     -51038,
//                     41529127,
//                     10487553403
//                 ]
//             }
//         },
//         "limit": 10000,
//         "skip": 0,
//         "fields": {
//             "ObjectID": 1,
//             "Iteration": 1,
//             "AcceptedDate": 1,
//             "_ValidFrom": 1,
//             "_ValidTo": 1,
//             "Project": 1,
//             "_UnformattedID": 1,
//             "_TypeHierarchy": "['$slice': -1]"
//         },
//         "compress": true
//     },
//     "TotalResultCount": 143,
//     "HasMore": false,
//     "StartIndex": 0,
//     "PageSize": 10000,
//     "ETLDate": "2021-07-22T21:01:40.284Z",
//     "CompressedResultCount": 32,
//     "Results": [
//         {
//             "_ValidFrom": "2021-07-02T14:52:22.634Z",
//             "_ValidTo": "2021-07-19T13:48:30.148Z",
//             "ObjectID": 603090302937,
//             "Iteration": 521511480168,
//             "FormattedID": "S207054"
//         },
//         {
//             "_ValidFrom": "2021-07-02T14:53:14.991Z",
//             "_ValidTo": "2021-07-13T16:53:19.234Z",
//             "ObjectID": 603091400171,
//             "Iteration": 521511480168,
//             "FormattedID": "S207057"
//         },
//         {
//             "_ValidFrom": "2021-07-02T14:53:27.608Z",
//             "_ValidTo": "2021-07-13T16:55:44.333Z",
//             "ObjectID": 370791356924,
//             "Iteration": 521511480168,
//             "FormattedID": "S186566"
//         },
//         {
//             "_ValidFrom": "2021-07-02T14:54:03.892Z",
//             "_ValidTo": "2021-07-06T14:43:37.934Z",
//             "ObjectID": 603090593481,
//             "Iteration": 521511480168,
//             "FormattedID": "S207056"
//         },
//         {
//             "_ValidFrom": "2021-07-02T14:54:19.776Z",
//             "_ValidTo": "2021-07-07T18:04:41.662Z",
//             "ObjectID": 603092333899,
//             "Iteration": 521511480168,
//             "FormattedID": "S207058"
//         },
//         {
//             "_ValidFrom": "2021-07-02T14:54:33.920Z",
//             "_ValidTo": "2021-07-08T18:23:55.918Z",
//             "ObjectID": 603092335759,
//             "Iteration": 521511480168,
//             "FormattedID": "S207059"
//         },
//         {
//             "_ValidFrom": "2021-07-02T15:24:37.079Z",
//             "_ValidTo": "2021-07-19T16:22:53.199Z",
//             "ObjectID": 600929299315,
//             "Iteration": 521511480168,
//             "FormattedID": "S206098"
//         },
//         {
//             "_ValidFrom": "2021-07-06T14:43:37.934Z",
//             "_ValidTo": "9999-01-01T00:00:00.000Z",
//             "ObjectID": 603090593481,
//             "Iteration": 521511480168,
//             "AcceptedDate": "2021-07-06T14:43:37.895Z",
//             "FormattedID": "S207056"
//         },
//         {
//             "_ValidFrom": "2021-07-06T17:39:24.122Z",
//             "_ValidTo": "2021-07-07T19:39:19.197Z",
//             "ObjectID": 601372709425,
//             "Iteration": 521511480168,
//             "FormattedID": "S206298"
//         },
//         {
//             "_ValidFrom": "2021-07-06T17:39:26.448Z",
//             "_ValidTo": "2021-07-09T22:37:03.384Z",
//             "ObjectID": 602859372333,
//             "Iteration": 521511480168,
//             "FormattedID": "S206977"
//         },
//         {
//             "_ValidFrom": "2021-07-07T18:04:41.662Z",
//             "_ValidTo": "9999-01-01T00:00:00.000Z",
//             "ObjectID": 603092333899,
//             "Iteration": 521511480168,
//             "AcceptedDate": "2021-07-07T18:04:41.609Z",
//             "FormattedID": "S207058"
//         },
//         {
//             "_ValidFrom": "2021-07-07T19:39:19.197Z",
//             "_ValidTo": "9999-01-01T00:00:00.000Z",
//             "ObjectID": 601372709425,
//             "Iteration": 521511480168,
//             "AcceptedDate": "2021-07-07T19:39:19.133Z",
//             "FormattedID": "S206298"
//         },
//         {
//             "_ValidFrom": "2021-07-08T18:23:55.918Z",
//             "_ValidTo": "9999-01-01T00:00:00.000Z",
//             "ObjectID": 603092335759,
//             "Iteration": 521511480168,
//             "AcceptedDate": "2021-07-08T18:23:55.878Z",
//             "FormattedID": "S207059"
//         },
//         {
//             "_ValidFrom": "2021-07-09T16:41:06.632Z",
//             "_ValidTo": "2021-07-09T22:37:41.255Z",
//             "ObjectID": 603576122367,
//             "Iteration": 521511480168,
//             "FormattedID": "S207254"
//         },
//         {
//             "_ValidFrom": "2021-07-09T22:30:23.273Z",
//             "_ValidTo": "2021-07-13T18:09:39.302Z",
//             "ObjectID": 603592912019,
//             "Iteration": 521511480168,
//             "FormattedID": "S207268"
//         },
//         {
//             "_ValidFrom": "2021-07-09T22:33:42.105Z",
//             "_ValidTo": "2021-07-16T16:40:05.811Z",
//             "ObjectID": 603592935239,
//             "Iteration": 521511480168,
//             "FormattedID": "S207269"
//         },
//         {
//             "_ValidFrom": "2021-07-09T22:34:32.735Z",
//             "_ValidTo": "2021-07-19T13:48:27.669Z",
//             "ObjectID": 603592996517,
//             "Iteration": 521511480168,
//             "FormattedID": "S207270"
//         },
//         {
//             "_ValidFrom": "2021-07-09T22:37:19.694Z",
//             "_ValidTo": "2021-07-14T16:20:39.616Z",
//             "ObjectID": 602859372333,
//             "Iteration": 521511480168,
//             "FormattedID": "S206977"
//         },
//         {
//             "_ValidFrom": "2021-07-09T22:37:03.384Z",
//             "_ValidTo": "2021-07-09T22:37:19.694Z",
//             "ObjectID": 602859372333,
//             "Iteration": 521511480168,
//             "FormattedID": "S206977"
//         },
//         {
//             "_ValidFrom": "2021-07-09T22:39:59.873Z",
//             "_ValidTo": "2021-07-16T16:24:31.707Z",
//             "ObjectID": 603592842543,
//             "Iteration": 521511480168,
//             "FormattedID": "S207271"
//         },
//         {
//             "_ValidFrom": "2021-07-12T17:20:54.243Z",
//             "_ValidTo": "2021-07-19T16:20:18.847Z",
//             "ObjectID": 603690887419,
//             "Iteration": 521511480168,
//             "FormattedID": "S207293"
//         },
//         {
//             "_ValidFrom": "2021-07-13T16:31:56.057Z",
//             "_ValidTo": "2021-07-13T16:34:26.871Z",
//             "ObjectID": 603154145165,
//             "Iteration": 521511480168,
//             "FormattedID": "S207067"
//         },
//         {
//             "_ValidFrom": "2021-07-13T16:53:19.234Z",
//             "_ValidTo": "9999-01-01T00:00:00.000Z",
//             "ObjectID": 603091400171,
//             "Iteration": 521511480168,
//             "AcceptedDate": "2021-07-13T16:53:19.167Z",
//             "FormattedID": "S207057"
//         },
//         {
//             "_ValidFrom": "2021-07-13T18:09:39.302Z",
//             "_ValidTo": "9999-01-01T00:00:00.000Z",
//             "ObjectID": 603592912019,
//             "Iteration": 521511480168,
//             "AcceptedDate": "2021-07-13T18:09:39.260Z",
//             "FormattedID": "S207268"
//         },
//         {
//             "_ValidFrom": "2021-07-13T19:38:40.637Z",
//             "_ValidTo": "2021-07-15T16:47:25.960Z",
//             "ObjectID": 603798998627,
//             "Iteration": 521511480168,
//             "FormattedID": "S207337"
//         },
//         {
//             "_ValidFrom": "2021-07-14T16:20:58.094Z",
//             "_ValidTo": "2021-07-19T16:20:49.230Z",
//             "ObjectID": 602859372333,
//             "Iteration": 521511480168,
//             "FormattedID": "S206977"
//         },
//         {
//             "_ValidFrom": "2021-07-14T16:20:50.073Z",
//             "_ValidTo": "2021-07-14T16:20:58.094Z",
//             "ObjectID": 602859372333,
//             "Iteration": 521511480168,
//             "FormattedID": "S206977"
//         },
//         {
//             "_ValidFrom": "2021-07-14T16:20:39.616Z",
//             "_ValidTo": "2021-07-14T16:20:50.073Z",
//             "ObjectID": 602859372333,
//             "Iteration": 521511480168,
//             "FormattedID": "S206977"
//         },
//         {
//             "_ValidFrom": "2021-07-15T16:52:36.531Z",
//             "_ValidTo": "2021-07-16T16:20:19.286Z",
//             "ObjectID": 603979156755,
//             "Iteration": 521511480168,
//             "FormattedID": "S207393"
//         },
//         {
//             "_ValidFrom": "2021-07-16T16:20:19.286Z",
//             "_ValidTo": "9999-01-01T00:00:00.000Z",
//             "ObjectID": 603979156755,
//             "Iteration": 521511480168,
//             "AcceptedDate": "2021-07-16T16:20:19.163Z",
//             "FormattedID": "S207393"
//         },
//         {
//             "_ValidFrom": "2021-07-16T16:24:31.707Z",
//             "_ValidTo": "2021-07-22T17:16:02.036Z",
//             "ObjectID": 603592842543,
//             "Iteration": 521511480168,
//             "AcceptedDate": "2021-07-16T16:24:31.610Z",
//             "FormattedID": "S207271"
//         },
//         {
//             "_ValidFrom": "2021-07-16T16:40:05.811Z",
//             "_ValidTo": "2021-07-19T16:39:07.262Z",
//             "ObjectID": 603592935239,
//             "Iteration": 521511480168,
//             "AcceptedDate": "2021-07-16T16:40:05.773Z",
//             "FormattedID": "S207269"
//         }
//     ],
//     "ThreadStats": {
//         "cpuTime": "36.732735",
//         "waitTime": "0",
//         "waitCount": "0",
//         "blockedTime": "0",
//         "blockedCount": "0"
//     },
//     "Timings": {
//         "preProcess": 0.0,
//         "findEtlDate": 99.0,
//         "allowedValuesDisambiguation": 2293.0,
//         "mongoQuery": 6.0,
//         "authorization": 2.0,
//         "formattedId": 6.0,
//         "suppressNonRequested": 2.0,
//         "compressSnapshots": 1.0,
//         "allowedValuesHydration": 0.0,
//         "TOTAL": 2409.0
//     }
//     }
// };

var acceptedBeforeStartData = {
    timeboxStartDate: "2021-07-03T00:00:00Z",
    timeboxEndDate:"2021-07-17T00:00:00Z",
    timeboxOidStart: 521511480168,
    snaps: [{
        "_ValidFrom": "2021-07-01T14:52:22.634Z",
        "_ValidTo": "2021-07-02T13:48:30.148Z",
        "ObjectID": 1,
        "Iteration": 521511480168,
        "AcceptedDate": "2021-07-01T14:52:22.634Z",
        "PlanEstimate": 3,
        "FormattedID": "S207054"
    },{
        "_ValidFrom": "2021-07-02T13:48:30.148Z",
        "_ValidTo": "2021-07-10T13:48:30.148Z",
        "ObjectID": 1,
        "Iteration": 521511480168,
        "AcceptedDate": "2021-07-01T14:52:22.634Z",
        "PlanEstimate": 3,
        "FormattedID": "S207054"
    },{
        "_ValidFrom": "2021-07-10T13:48:30.148Z",
        "_ValidTo": "2021-07-19T13:48:30.148Z",
        "ObjectID": 1,
        "Iteration": 521511480168,
        "AcceptedDate": "2021-07-01T14:52:22.634Z",
        "PlanEstimate": 3,
        "FormattedID": "S207054"
    }]
};