Ext.define('RolloverCalculator', {
    statics: {
        SERIES_NAME: ["0","1","2","3","4","5+"],
        SERIES_COLOR: ["#66b3ff","#79ff4d","#ffb84d","#ff1a75","#00e68a","#ac39ac"],
        Y_AXIS_TITLE: "Story Count",
        CHART_TITLE: "Rolled Over Stories",
    
        _initArray: function(len, initValue){
            var arr = [];
            for (var i=0;i<len;i++){ arr[i] = initValue }
            return arr; 
        },
        getTimeboxNamesAsc: function(timeboxGroups){
            var timeboxes = [];
            for (var i=0; i<timeboxGroups.length; i++){
                timeboxes.unshift(timeboxGroups[i][0].get('Name'));
            }
            return timeboxes;
        },

        getTimeboxDataHash: function(timeboxGroups, useFormattedID){
            var timeboxDataHash = {};
            useFormattedID = useFormattedID || false; 
            var maxRollover = timeboxGroups.length; 
            var currName = null; 
            
            for (var i=timeboxGroups.length-1; i>=0; i--){
                currName = timeboxGroups[i][0].get('Name');
                if (!timeboxDataHash[currName]){
                    timeboxDataHash[currName]={
                        rolloverCount: RolloverCalculator._initArray(maxRollover,0),
                        rolloverOids: {}
                    };
                }
                for (var j=0; j<timeboxGroups[i].length; j++){
                    var timebox = timeboxGroups[i][j];
                    var rollovers = timebox.getRolloverObjectCountHash(useFormattedID);
                    console.log('rollovers',rollovers);
                    timeboxDataHash[currName].rolloverOids = _.reduce(rollovers, function(hsh,v,k){
                        timeboxDataHash[currName].rolloverCount[v]++;
                        if (v>0){
                            hsh[k]=v;
                        }
                        return hsh; 
                    }, timeboxDataHash[currName].rolloverOids);
                }
            }

            console.log('timeboxHash', timeboxDataHash)
            return timeboxDataHash;
        },
        getChartData: function(timeboxGroups){
            
            console.log('timeboxGroups',timeboxGroups);
            //NOTE - timeboxGroups are in descending order -- newest to oldest 
            var timeboxNames = RolloverCalculator.getTimeboxNamesAsc(timeboxGroups);
            var timeboxDataHash = RolloverCalculator.getTimeboxDataHash(timeboxGroups);


            var chartData = {
                categories: timeboxNames,
                series: [{
                    name: RolloverCalculator.SERIES_NAME[0],
                    data: [],
                    legendIndex: 1,
                    color: RolloverCalculator.SERIES_COLOR[0],
                    stack: 'rollover'
                }, {
                    name: RolloverCalculator.SERIES_NAME[1],
                    data: [],
                    legendIndex: 1,
                    color: RolloverCalculator.SERIES_COLOR[1],
                    stack: 'rollover'
                }, {
                    name: RolloverCalculator.SERIES_NAME[2],
                    color: RolloverCalculator.SERIES_COLOR[2],
                    data: [],
                    legendIndex: 1,
                    stack: 'rollover'
                }, {
                    name: RolloverCalculator.SERIES_NAME[3],
                    color: RolloverCalculator.SERIES_COLOR[3],
                    data: [],
                    legendIndex: 1,
                    stack: 'rollover'
                }, {
                    name: RolloverCalculator.SERIES_NAME[4],
                    color: RolloverCalculator.SERIES_COLOR[4],
                    data: [],
                    legendIndex: 1,
                    stack: 'rollover'
                }, {
                    name: RolloverCalculator.SERIES_NAME[5],
                    color: RolloverCalculator.SERIES_COLOR[5],
                    data: [],
                    legendIndex: 1,
                    stack: 'rollover'
                }]
            }

               for (var j=0;j<chartData.series.length; j++){ 
                    for (var i=0; i<timeboxNames.length; i++){
                        var tbName = timeboxNames[i];
                        console.log(tbName);
                        chartData.series[j].data[i] = timeboxDataHash[tbName] && timeboxDataHash[tbName].rolloverCount[j] || 0;
                        
                    }
            }
            console.log('chartData',chartData)
            return chartData;

        },
        getChartTitle: function(){
            return RolloverCalculator.CHART_TITLE;
        },
        getChartConfig: function(chartData){
            return {
                xtype: 'rallychart',
                loadMask: false,
                chartColors: [
                    "#FAD200", // $yellow
                    "#8DC63F", // $lime
                ],
                chartConfig: {
                    chart: {
                        type: 'column',
                        animation: false
                    },
                    title: {
                        text: RolloverCalculator.getChartTitle()
                    },
                    legend: {
                        layout: 'horizontal',
                        labelFormatter: function() {
                            var result = this.name;
                            return result;
                        }
                    },
                    plotOptions: {
                        column: {
                            stacking: 'normal'
                        },
                        dataLabels: {
                            enabled: false 
                        },
                        series: {
                            animation: false,
                            events: {
                                legendItemClick: function() { return false; } // Disable hiding some of data on legend click
                            }
                        }
                    },
                    yAxis: {
                        allowDecimals: false,
                        title: {
                            text: RolloverCalculator.Y_AXIS_TITLE
                        }
                    },
                    xAxis: [{
                        title: {
                            enabled: true,
                            text: "Iterations",
                            style: {
                                fontWeight: "bold"
                            }
                        },
                        categories: chartData.categories
                    }],
                    tooltip: {
                        shared: true,
                        valueSuffix: " Stories"
                    },
                },
                chartData: chartData 
            }
        },
        fetchRolledOverStories: function(timeboxGroups, status,dataContext,cacheField){
            var deferred = Ext.create('Deft.Deferred');
            var promises = []; 
            
            for (var i=0; i<timeboxGroups.length-1 ; i++ ){

                var prevStartDate = null,
                    currentEndDate = null;
                // var previousTimeboxes = _.map(timeboxGroups[i+1], function(tb){
                //     if (!prevStartDate){ prevStartDate = tb.getStartDate().toISOString(); }
                //     return tb.get('ObjectID');
                // });
                // var currentTimeboxes = _.map(timeboxGroups[i], function(tb){
                //     if (!prevStartDate){ prevStartDate = tb.getStartDate().toISOString(); }
                //     if (!currentEndDate ){ currentEndDate = tb.getEndDate().toISOString(); }
                //     return tb.get('ObjectID');
                // });

                var currentTimeboxes = _.reduce(timeboxGroups[i], function(arr, tb){
                    if (!prevStartDate){ prevStartDate = tb.getStartDate().toISOString(); }
                    if (!currentEndDate ){ currentEndDate = tb.getEndDate().toISOString(); }
                    if (!tb.isRolloverValid()){
                        arr.push(tb.get('ObjectID'));
                    }
                    return arr;
                },[]);
        
                var prevFilter = {
                    property: '_PreviousValues.Iteration',
                    operator: ">",
                    value: 0
                };
                // if (previousTimeboxes.length > 0){
                //     prevFilter = {
                //         property: '_PreviousValues.Iteration',
                //         operator: "in",
                //         value: previousTimeboxes
                //     }
                // }
                if (currentTimeboxes.length > 0){
                    var filters = [{
                        property: '_TypeHierarchy',
                        value: 'HierarchicalRequirement'
                    },
                    {
                        property: 'Iteration',
                        operator: 'in',
                        value: currentTimeboxes
                    },
                    prevFilter
                    // ,{
                    //     property: '_ValidTo',
                    //     operator: '>',
                    //     value: prevStartDate
                    // }
                    ];
                    promises.push(RolloverCalculator.fetchSnapshots(filters,status,dataContext));
                }
            }
            var lastIterationStartDate = timeboxGroups[timeboxGroups.length-1][0].getStartDate().toISOString();
            Deft.Promise.all(promises).then({
                success: function(results){
                    var lastIterationRollovers = results[results.length - 1];
                    var promises = []; 
                    var maxChunk = 10000;
                    for (i=0; i<lastIterationRollovers.length; i=i+maxChunk){
                        var rollovers = lastIterationRollovers.slice(i,i+maxChunk);
                        promises.push(RolloverCalculator.fetchLastIterationRollovers(status,rollovers,lastIterationStartDate,dataContext))
                    }
                    
                    if (promises.length > 0){
                        //RolloverCalculator.fetchLastIterationRollovers(status,lastIterationRollovers,lastIterationStartDate,dataContext).then({
                        Deft.Promise.all(promises).then({
                            success: function(lastIterationRolloverResults){
                                lastIterationRolloverResults = _.flatten(lastIterationRolloverResults);
                                //results.push(lastIterationRolloverResults);
                                //RolloverCalculator.processSnaps(results, lastIterationRolloverResults, timeboxGroups);
                                var rolloverHash = RolloverCalculator.buildItemRolloverHash(results, lastIterationRolloverResults,timeboxGroups,cacheField);
                                status.done();
                                deferred.resolve(timeboxGroups);
                            }
                            //failure:
                        });
                    } else {
                        RolloverCalculator.buildItemRolloverHash(results, [],timeboxGroups,cacheField);
                        status.done();
                        deferred.resolve(timeboxGroups);
                    }
                    
                    
                },
                failure: function(msg){},
                scope: this 
            });  
            return deferred.promise; 
        },

        buildItemRolloverHash: function(rollovers, lastItemRollovers, timeboxGroups,cacheField){
            var itemDataHash = {},
                startDates = [];
            console.log('buildItemRolloverHash',rollovers,lastItemRollovers)
            var iterationMap = _.reduce(timeboxGroups, function(map,timeboxGroup){
                if (!_.contains(startDates,timeboxGroup[0].getStartDateMs())){
                    startDates.push(timeboxGroup[0].getStartDateMs());
                }
                _.each(timeboxGroup, function(tb){
                    var id = tb.get('ObjectID');
                    map[id] = tb;
                });
                return map; 
            },{});


            var allRollovers = _.flatten(rollovers);
            allRollovers = allRollovers.concat(lastItemRollovers);
       
            _.each(allRollovers, function(snap){

                var id = snap.get('ObjectID'),
                    prevIteration = snap.get('_PreviousValues.Iteration'),
                    iteration = snap.get('Iteration'),
                    validTo = Date.parse(snap.get('_ValidTo')),
                    validFrom = Date.parse(snap.get('_ValidFrom')),
                    iterationId = null,
                    prevIterationId = null;
                 
                    if (typeof iteration === 'object'){
                        //this is  from the last rollovers where iteration is hydrated
                        iterationId = iteration && iteration.ObjectID;
                        
                    } else {
                        //this is just the iteration id 
                        iterationId = iteration;
                        
                    }

                    if (typeof prevIteration === 'object'){
                        prevIterationId = prevIteration && prevIteration.ObjectID;
                    } else {
                        prevIterationId = prevIteration; 
                    }

                if (!itemDataHash[id]){
                    itemDataHash[id] = [];
                }
                if (prevIterationId && !iterationMap[prevIterationId]){
                    iterationMap[prevIterationId] = prevIteration;
                    iterationMap[prevIterationId].startDateMs = Date.parse(prevIteration.StartDate);
                    iterationMap[prevIterationId].endDateMs = Date.parse(prevIteration.EndDate);
                    if (!_.contains(startDates,iterationMap[prevIterationId].startDateMs)){
                        startDates.push(iterationMap[prevIterationId].startDateMs);
                    }
                }
                if (iterationId && !iterationMap[iterationId]){
                    iterationMap[iterationId] = iteration;
                    iterationMap[iterationId].startDateMs = Date.parse(iteration.StartDate);
                    iterationMap[iterationId].endDateMs = Date.parse(iteration.EndDate);
                    if (!_.contains(startDates,iterationMap[iterationId].startDateMs)){
                        startDates.push(iterationMap[iterationId].startDateMs);
                    }
                }
                itemDataHash[id].push(snap.data);
                
            });

            //TODO add index to iteration map
            startDates.sort() 
            _.each(iterationMap, function(tb,id){
                var startDateMs = tb.startDateMs || tb.getStartDateMs();
                tb.index = startDates.indexOf(startDateMs);
            });

            var itemRolloverHash = {};

            _.each(itemDataHash, function(dataArray,id){
                dataArray.sort(function(a,b){
                    if (Date.parse(a._ValidFrom) > Date.parse(b._ValidFrom)){ return 1; }
                    else { return -1;}
                });
                //data array should be sorted ascending

                itemRolloverHash[id] = {};

                _.each(dataArray, function(d){
                
                    var pid = d["_PreviousValues.Iteration"].ObjectID || d["_PreviousValues.Iteration"] || d._PreviousValues.Iteration || null,
                        iid = d.Iteration.ObjectID || d.Iteration || null,
                        oid = d.ObjectID;
                    ///if previousIteration index + 1 = iteration index then we want to do this, 
                    //otherwise dont.  
                     if (iterationMap[pid].index + 1 === iterationMap[iid].index){
                        var rollover = itemRolloverHash[oid][pid] || 0;
                        itemRolloverHash[oid][iid] = rollover + 1; 
                        if (iterationMap[iid] && iterationMap[iid].addRollover){
                            iterationMap[iid].addRollover(oid,itemRolloverHash[oid][iid],cacheField);
                        }
                    }
                });

            });   
            console.log('itemRolloverHash',itemRolloverHash);

            // _.each(itemRolloverHash, function(iterationHash,itemId){
            //     _.each(iterationHash, function(iteration,iterationOid){
            //         if (iterationMap[iterationOid] && iterationMap[iterationOid].addRollover){
            //             iterationMap[iterationOid].addRollover(itemId,iteration);
            //         }
            //     });
            // });

            return itemRolloverHash; 
            
        },

        fetchLastIterationRollovers: function(status, lastRolloverSnaps,lastIterationStartDateIso,dataContext){
            var key = 'Loading historical over stories';
            var fields = ['Iteration', '_ValidFrom', '_ValidTo', 'ObjectID','_PreviousValues.Iteration','FormattedID'];
            
            var oids = _.map(lastRolloverSnaps, function(snap){
                return snap.get('ObjectID');
            });

            var find = {
                   ObjectID: {"$in": oids},
                   _ValidFrom: {"$lte": lastIterationStartDateIso},
                   Iteration: {"$ne": null},
                   "_PreviousValues.Iteration": {"$ne": null}
            };
            console.log('oids',oids.length);
         
            var store = Ext.create('Rally.data.lookback.SnapshotStore', {
                autoLoad: false,
                context: dataContext,
                fetch: fields,
                hydrate: ['Iteration','_PreviousValues.Iteration'],
                pageSize: 20000,
                sortConfig: {},
                limit: Infinity,
                remoteSort: false,
                compress: true,
                useHttpPost: true, 
                removeUnauthorizedSnapshots: true, 
                find: find,
                exceptionHandler: function(proxy, request){
                    status.addError(key);
                },
    
                listeners: {
                    beforeload: function(){
                        status.progressStart(key);
                    },
                    load: function(){
                        status.progressEnd(key);
                    },
                    scope: this
                }
            });
            return store.load(); 
        },
        fetchSnapshots: function(filters, status,dataContext){
            var key = 'Loading rolled over stories';
            var fields = ['Iteration', '_ValidFrom', '_ValidTo', 'ObjectID','_PreviousValues.Iteration','FormattedID'];
            var store = Ext.create('Rally.data.lookback.SnapshotStore', {
                autoLoad: false,
                context: dataContext,
                fetch: fields,
                hydrate: ["_PreviousValues.Iteration"],
                sortConfig: {},
                limit: Infinity,
                remoteSort: false,
                compress: true,
                useHttpPost: true, 
                filters: filters,
                removeUnauthorizedSnapshots: true, 
                exceptionHandler: function(proxy, request){
                    status.addError(key);
                },
    
                listeners: {
                    beforeload: function(){
                        status.progressStart(key);
                    },
                    load: function(){
                        status.progressEnd(key);
                    },
                    scope: this
                }
            });
            return store.load();
        }
    }
});