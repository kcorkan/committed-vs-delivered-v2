
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

var durationData1DayInside = {
    timeboxStartDate: "2021-07-03T00:00:00Z",
    timeboxEndDate:"2021-07-17T00:00:00Z",
    timeboxOidStart: 521511480168,
    snaps: [{
        "_ValidFrom": "2021-07-06T14:52:22.634Z",
        "_ValidTo": "2021-07-06T15:48:30.148Z",
        "ObjectID": 1,
        "Iteration": 521511480168,
        "AcceptedDate": null,
        "PlanEstimate": 3,
        "FormattedID": "S207054"
    },{
        "_ValidFrom": "2021-07-06T15:48:30.148Z",
        "_ValidTo": "2021-07-06T20:48:30.148Z",
        "ObjectID": 1,
        "Iteration": 521511480168,
        "AcceptedDate": null,
        "PlanEstimate": 3,
        "FormattedID": "S207054"
    },{
        "_ValidFrom": "2021-07-06T20:48:30.148Z",
        "_ValidTo": "2021-07-07T13:48:30.148Z",
        "ObjectID": 1,
        "Iteration": 521511480168,
        "AcceptedDate": null,
        "PlanEstimate": 3,
        "FormattedID": "S207054"
    }]
};

var durationData1DayEnd = {
    timeboxStartDate: "2021-07-03T00:00:00Z",
    timeboxEndDate:"2021-07-17T00:00:00Z",
    timeboxOidStart: 521511480168,
    snaps: [{
        "_ValidFrom": "2021-07-16T01:00:00.000Z",
        "_ValidTo": "2021-07-16T15:48:30.148Z",
        "ObjectID": 1,
        "Iteration": 521511480168,
        "AcceptedDate": "2021-07-16T01:00:00.000Z",
        "PlanEstimate": 3,
        "FormattedID": "S207054"
    },{
        "_ValidFrom": "2021-07-16T15:48:30.148Z",
        "_ValidTo": "2021-07-17T21:48:30.148Z",
        "ObjectID": 1,
        "Iteration": 521511480168,
        "AcceptedDate": "2021-07-16T01:00:00.000Z",
        "PlanEstimate": 3,
        "FormattedID": "S207054"
    }]
};

var durationData1DayStart = {
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

var acceptedAfterTimebox = {
    timeboxStartDate: "2021-07-03T00:00:00Z",
    timeboxEndDate:"2021-07-17T00:00:00Z",
    timeboxOidStart: 521511480168,
    snaps: [{
        "_ValidFrom": "2021-07-01T14:52:22.634Z",
        "_ValidTo": "2021-07-05T13:48:30.148Z",
        "ObjectID": 1,
        "Iteration": 521511480168,
        "AcceptedDate": null,
        "PlanEstimate": 3,
        "FormattedID": "S207054"
    },{
        "_ValidFrom": "2021-07-02T13:48:30.148Z",
        "_ValidTo": "2021-07-17T00:00:01.000Z",
        "ObjectID": 1,
        "Iteration": 521511480168,
        "AcceptedDate": null,
        "PlanEstimate": 3,
        "FormattedID": "S207054"
    },{
        "_ValidFrom": "2021-07-17T00:00:01.000Z",
        "_ValidTo": "2021-07-19T13:48:30.148Z",
        "ObjectID": 1,
        "Iteration": 521511480168,
        "AcceptedDate": "2021-07-17T00:00:01.000Z",
        "PlanEstimate": 3,
        "FormattedID": "S207054"
    }]
};

var changingPoints = {
    timeboxStartDate: "2021-07-03T00:00:00Z",
    timeboxEndDate:"2021-07-17T00:00:00Z",
    timeboxOidStart: 521511480168,
    snaps: [{
        "_ValidFrom": "2021-07-01T14:52:22.634Z",
        "_ValidTo": "2021-07-05T13:48:30.148Z",
        "ObjectID": 1,
        "Iteration": 521511480168,
        "AcceptedDate": null,
        "PlanEstimate": 2,
        "FormattedID": "S207054"
    },{
        "_ValidFrom": "2021-07-02T13:48:30.148Z",
        "_ValidTo": "2021-07-16T00:00:01.000Z",
        "ObjectID": 1,
        "Iteration": 521511480168,
        "AcceptedDate": null,
        "PlanEstimate": 5,
        "FormattedID": "S207054"
    },{
        "_ValidFrom": "2021-07-16T00:00:01.000Z",
        "_ValidTo": "2021-07-19T13:48:30.148Z",
        "ObjectID": 1,
        "Iteration": 521511480168,
        "AcceptedDate": "2021-07-16T00:00:01.000Z",
        "PlanEstimate": 5,
        "FormattedID": "S207054"
    },{
        "_ValidFrom": "2021-07-02T14:52:22.634Z",
        "_ValidTo": "2021-07-10T13:48:30.148Z",
        "ObjectID": 2,
        "Iteration": 521511480168,
        "AcceptedDate": null,
        "PlanEstimate": 8,
        "FormattedID": "S207054"
    },{
        "_ValidFrom": "2021-07-10T13:48:30.148Z",
        "_ValidTo": "2021-07-14T00:00:01.000Z",
        "ObjectID": 2,
        "Iteration": 521511480168,
        "AcceptedDate": null,
        "PlanEstimate": 8,
        "FormattedID": "S207054"
    },{
        "_ValidFrom": "2021-07-14T00:00:01.000Z",
        "_ValidTo": "2021-07-19T13:48:30.148Z",
        "ObjectID":2,
        "Iteration": 521511480168,
        "AcceptedDate": "2021-07-16T00:00:01.000Z",
        "PlanEstimate": 8,
        "FormattedID": "S207054"
    }]
};

var missingPoints = {
    timeboxStartDate: "2021-07-03T00:00:00Z",
    timeboxEndDate:"2021-07-17T00:00:00Z",
    timeboxOidStart: 521511480168,
    snaps: [{
        "_ValidFrom": "2021-07-01T14:52:22.634Z",
        "_ValidTo": "2021-07-05T13:48:30.148Z",
        "ObjectID": 1,
        "Iteration": 521511480168,
        "AcceptedDate": null,
        "PlanEstimate": null,
        "FormattedID": "S207054"
    },{
        "_ValidFrom": "2021-07-02T13:48:30.148Z",
        "_ValidTo": "2021-07-16T00:00:01.000Z",
        "ObjectID": 1,
        "Iteration": 521511480168,
        "AcceptedDate": null,
        "PlanEstimate": 5,
        "FormattedID": "S207054"
    },{
        "_ValidFrom": "2021-07-16T00:00:01.000Z",
        "_ValidTo": "2021-07-19T13:48:30.148Z",
        "ObjectID": 1,
        "Iteration": 521511480168,
        "AcceptedDate": "2021-07-16T00:00:01.000Z",
        "PlanEstimate": 5,
        "FormattedID": "S207054"
    },{
        "_ValidFrom": "2021-07-02T14:52:22.634Z",
        "_ValidTo": "2021-07-10T13:48:30.148Z",
        "ObjectID": 2,
        "Iteration": 521511480168,
        "AcceptedDate": null,
        "PlanEstimate": 8,
        "FormattedID": "S207054"
    },{
        "_ValidFrom": "2021-07-10T13:48:30.148Z",
        "_ValidTo": "2021-07-14T00:00:01.000Z",
        "ObjectID": 2,
        "Iteration": 521511480168,
        "AcceptedDate": null,
        "PlanEstimate": 8,
        "FormattedID": "S207054"
    },{
        "_ValidFrom": "2021-07-14T00:00:01.000Z",
        "_ValidTo": "2021-07-19T13:48:30.148Z",
        "ObjectID":2,
        "Iteration": 521511480168,
        "AcceptedDate": "2021-07-16T00:00:01.000Z",
        "PlanEstimate": 8,
        "FormattedID": "S207054"
    }]
};
var movedItems = {
    timeboxStartDate: "2021-07-03T00:00:00Z",
    timeboxEndDate:"2021-07-17T00:00:00Z",
    timeboxOidStart: 521511480168,
    snaps: [{
        "_ValidFrom": "2021-07-01T14:52:22.634Z",
        "_ValidTo": "2021-07-05T13:48:30.148Z",
        "ObjectID": 1,
        "Iteration": 521511480168,
        "AcceptedDate": null,
        "PlanEstimate": 5,
        "FormattedID": "S207054"
    },{
        "_ValidFrom": "2021-07-05T13:48:30.148Z",
        "_ValidTo": "2021-07-16T00:00:01.000Z",
        "ObjectID": 1,
        "Iteration": 521511480169,
        "AcceptedDate": null,
        "PlanEstimate": 5,
        "FormattedID": "S207054"
    },{
        "_ValidFrom": "2021-07-16T00:00:01.000Z",
        "_ValidTo": "2021-07-19T13:48:30.148Z",
        "ObjectID": 1,
        "Iteration": 521511480168,
        "AcceptedDate": "2021-07-16T00:00:01.000Z",
        "PlanEstimate": 5,
        "FormattedID": "S207054"
    }]
};

var itemInSprintBeforeStart = {
    timeboxStartDate: "2018-10-03T00:00:00Z",
    timeboxEndDate:"2018-10-17T00:00:00Z",
    timeboxOidStart: 254865338488,
    snaps: [{
        AcceptedDate: "",
        FormattedID: "US26977",
        Iteration: 254865338488,
        ObjectID: 254865350152,
        PlanEstimate: 20,
        Project: 46641719800,
        _ValidFrom: "2018-09-20T21:51:02.116Z",
        _ValidTo: "2018-09-20T21:59:10.131Z"
    }]
}