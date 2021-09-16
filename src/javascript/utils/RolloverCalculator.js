Ext.define('RolloverCalculator', {
    statics: {
        SERIES_NAME: ["0","1","2","3","4","5+"],
        SERIES_COLOR: ["#66b3ff","#79ff4d","#ffb84d","#ff1a75","#00e68a","#ac39ac"],
        Y_AXIS_TITLE: "Story Count",
        CHART_TITLE: "Rolled Over Stories",
        getArtifactHash: function(timeboxGroups){
            var artifactHash = {};
            for (var i=timeboxGroups.length-1; i>0; i--){
                var timeboxes = timeboxGroups[i];
                for (var j=0; j<timeboxes.length; j++){
                    var timebox = timeboxes[j],
                        cache = timebox.getCacheObject(); 
                        artifactHash = _.reduce(cache.data, function(hash, info,oid){
                            var id = info[TimeboxCacheModelBuilder.FID_IDX];
                            if (!hash[id]){
                                hash[id] = {};
                            } 
                            if (!hash[id][timebox.get('Name')]){
                                hash[id][timebox.get('Name')] = 0; //RolloverCalculator._initArray(timeboxGroups.length,[]);
                            } 
                            if (_.contains(cache.rollovers, id)){
                                hash[id][timebox.get('Name')]++;
                            }
                            return hash; 
                        },artifactHash);            
                } //end timeboxes 

            } //end timeboxGroups 
            console.log('artifactHash',artifactHash)  
            return artifactHash;  
        },
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
        getTimeboxDataHash: function(timeboxGroups,useFormattedID){
            var timeboxDataHash = {};
            useFormattedID = useFormattedID || false; 
            var maxRollover = timeboxGroups.length-1; 
            var prevName = null,
                currName = null; 
            
            for (var i=timeboxGroups.length-1; i>0; i--){
                prevName = currName; 
                currName = timeboxGroups[i][0].get('Name');
                if (!timeboxDataHash[currName]){
                    timeboxDataHash[currName]={
                        rolloverCount: RolloverCalculator._initArray(maxRollover,0),
                        rolloverOids: {}
                    };
                }
                for (var j=0; j<timeboxGroups[i].length; j++){
                    var rolloverData = timeboxGroups[i][j].getRolloverData(useFormattedID);
                    console.log('rooloverData',rolloverData)
                    timeboxDataHash[currName].rolloverCount[0] += rolloverData.zeroCount; 
                    for (var k=0; k<rolloverData.rollovers.length; k++){
                        var prevRollover = timeboxDataHash[prevName].rolloverOids[rolloverData.rollovers[k]] || 0;
                        console.log('prevRollover',prevRollover)
                        timeboxDataHash[currName].rolloverOids[rolloverData.rollovers[k]] = prevRollover + 1;
                        timeboxDataHash[currName].rolloverCount[prevRollover+1]++; 
                    }
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
        fetchRolledOverStories: function(timeboxGroups, status,dataContext){
            var deferred = Ext.create('Deft.Deferred');
            var promises = []; 
           
            for (var i=0; i<timeboxGroups.length-1 ; i++ ){
                console.log(timeboxGroups[i][0].get('StartDate'))
                var prevStartDate = null,
                    currentEndDate = null;
                var previousTimeboxes = _.map(timeboxGroups[i+1], function(tb){
                    //if (!prevStartDate){ prevStartDate = tb.getStartDate().toISOString(); }
                    return tb.get('ObjectID');
                });
                var currentTimeboxes = _.map(timeboxGroups[i], function(tb){
                    if (!prevStartDate){ prevStartDate = tb.getStartDate().toISOString(); }
                    if (!currentEndDate ){ currentEndDate = tb.getEndDate().toISOString(); }
                    return tb.get('ObjectID');
                });
        
                console.log('previous', prevStartDate, 'current', currentEndDate)
                if (previousTimeboxes.length > 0 && currentTimeboxes.length > 0){
                    var filters = [{
                        property: '_TypeHierarchy',
                        value: 'HierarchicalRequirement'
                    },
                    {
                        property: 'Iteration',
                        operator: 'in',
                        value: currentTimeboxes
                    },{
                        property: '_PreviousValues.Iteration',
                        operator: 'in',
                        value: previousTimeboxes
                    },{
                        property: '_ValidTo',
                        operator: '$gt',
                        value: prevStartDate
                    }
                    ];
                    promises.push(RolloverCalculator.fetchSnapshots(filters,status,dataContext));
                }
            }
    
            Deft.Promise.all(promises).then({
                success: function(results){
                    RolloverCalculator.processSnaps(results, timeboxGroups);
                    status.done();
                    deferred.resolve(timeboxGroups);
                    
                },
                failure: function(msg){},
                scope: this 
            });   
            return deferred.promise; 
        },
    
        processSnaps: function(snapshots, timeboxGroups){
            console.log('snapshots', snapshots.length);
            var snapshots = _.flatten(snapshots);
            console.log('snapshots', snapshots.length);
            var iterationMap = _.reduce(timeboxGroups, function(map,tb){
                for (var i=0; i<tb.length; i++){
                    map[tb[i].get('ObjectID')] = tb[i];
                }
                return map;  
            },{});
            console.log('iterationMap',iterationMap);
            var oids = {},
                exportMap = {};

            _.each(snapshots, function(b) {
                var oid = b.get("ObjectID"),
                    fid = b.get("FormattedID"),
                    iteration = b.get("Iteration"),
                    prevIteration = b.get("_PreviousValues.Iteration"),
                    validFrom = Date.parse(b.get("_ValidFrom")),
                    validTo = Date.parse(b.get('_ValidTo')),
                    prevIterationStartDate = iterationMap[prevIteration].getStartDateMs(),
                    timebox = iterationMap[iteration],
                    iterationEndDate = Date.parse(timebox.get('EndDate'));
                if (prevIteration && iteration && validTo > prevIterationStartDate && validFrom < iterationEndDate ){  //&& !(prevIterationStartDate > validFrom))
                    console.log('roolover vound')
                    if (timebox){
                        timebox.addRollover(oid,prevIteration,b);
                    } else {
                        console.log("NO timebox found for " + iteration);
                    }
                }
                    // if (!oids[oid]) {
                    //     oids[oid] = 1;
                    //     var k = {
                    //         FormattedID: "",
                    //         Iteration: "",
                    //         RolledOverCount: 0
                    //     };

                    //     k.FormattedID = fid;
                    //     //k.Iteration = a;
                    //     k.RolledOverCount = 1;
                    //     k[iteration] = 1;
                    //     exportMap[oid]=k;
                    
                            
                    // } else {
                    //     oids[oid] += 1;
                    //     var k = exportMap[oid];
                    //     k[iteration] = 1;  //we don't want to increment if the iteration is the same (k[iteration] || 0) + 1;
                    //     k.RolledOverCount = k.RolledOverCount + 1;
                    //     exportMap[oid] = k;
                    // }
            }, this);

            // var snapsByTimeboxOid = _.reduce(snapshots, function(hash,snap){
            //     var tbOid = snap.get('Iteration').toString();
            //     console.log('tboid',tbOid, snap.data)
            //     if (!hash[tbOid]){
            //         hash[tbOid] = [];
            //     }
               
            //     hash[tbOid].push(snap.data);
            //     console.log('hash',hash[tbOid]);
            //     return hash; 
            // },{});
            // console.log(snapsByTimeboxOid);
            // return snapsByTimeboxOid;
        },
        fetchSnapshots: function(filters, status,dataContext){
            var key = 'Loading rolled over stories';
            var fields = ['Iteration', '_ValidFrom', '_ValidTo', 'ObjectID','_PreviousValues.Iteration','FormattedID'];
            var store = Ext.create('Rally.data.lookback.SnapshotStore', {
                autoLoad: false,
                context: dataContext,
                fetch: fields,
                hydrate: [],
                pageSize: 20000,
                sortConfig: {},
                limit: Infinity,
                remoteSort: false,
                compress: true,
                useHttpPost: true, 
                filters: filters,
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