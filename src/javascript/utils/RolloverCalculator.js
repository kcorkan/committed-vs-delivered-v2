Ext.define('RolloverCalculator', {
    statics: {
        SERIES_NAME: ["0","1","2","3","4","5+"],
        SERIES_COLOR: ["#66b3ff","#79ff4d","#ffb84d","#ff1a75","#00e68a","#ac39ac"],
        Y_AXIS_TITLE: "Story Count",
        CHART_TITLE: "This chart title",
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
                timeboxes.push(timeboxGroups[i][0]);
            }
            timeboxes = _.sortBy(timeboxes,'EndDate');
            return _.map(timeboxes, function(t){
                return t.get('Name');
            });  
        },
        getChartData: function(timeboxGroups){
                
            var artifactHash = RolloverCalculator.getArtifactHash(timeboxGroups);
            var timeboxNames = RolloverCalculator.getTimeboxNamesAsc(timeboxGroups);

            var chartData = {
                categories: timeboxNames,
                series: [{
                    dataLabels: {
                        enabled: true,
                        format: '{total} ',
                        inside: false,
                        y: -20,
                        overflow: 'justify'
                    },
                    name: RolloverCalculator.SERIES_NAME[0],
                    data: [],
                    legendIndex: 2,
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
    
               console.log('artifactHash',artifactHash);
                //for (var j=0;j<chartData.series.length; j++){ chartData.series[j].data[i] = 0; }
                _.each(artifactHash, function(timeboxes,artifactOid){
                    var rollover = 0; 
                    for (var i=0; i<timeboxNames.length; i++){
                        var tbName = timeboxNames[i];
                        if (timeboxes[tbName] === 0){
                            rollover = 0; 
                            chartData.series[0].data[i]++;
                        }
                        if (timeboxes[tbName] === 1){
                            rollover++;
                            chartData.series[rollover].data[i]++;
                        }
                    }
                });
           // }
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
                        layout: 'vertical',
                        labelFormatter: function() {
                            var result = this.name;
                            return result;
                        }
                    },
                    plotOptions: {
                        column: {
                            stacking: 'normal'
                        },
                        series: {
                            animation: false,
                            dataLabels: {
                                align: 'center',
                                verticalAlign: 'top',
                            },
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
                    }
                },
                chartData: chartData 
            }
        },
        fetchRolledOverStories: function(timeboxGroups, status,dataContext){
            var deferred = Ext.create('Deft.Deferred');
            var promises = []; 
            for (var i=timeboxGroups.length-1; i > 0; i--){
                console.log(timeboxGroups[i][0].get('StartDate'))
                var previousTimeboxes = _.map(timeboxGroups[i-1], function(tb){
                    return tb.get('ObjectID');
                });
                var currentTimeboxes = _.map(timeboxGroups[i], function(tb){
                    return tb.get('ObjectID');
                });
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
                    },
                    //may not need this filter since the project is associated with the timeboxoids, but keeping to verify if it helps with performance.
                    // {
                    //     property: '_ProjectHierarchy',
                    //     value: Rally.util.Ref.getOidFromRef(dataContext.project)
                    // }
                    ];
                    promises.push(RolloverCalculator.fetchSnapshots(filters,status,dataContext));
                }
            }
    
            Deft.Promise.all(promises).then({
                success: function(results){
                    var snapshotsByTimeboxOid = RolloverCalculator.processSnaps(results);
                    console.log('here 1')
                    for (var i=0; i<timeboxGroups.length; i++){
                        for (var j=0; j< timeboxGroups[i].length; j++){
                            var timebox = timeboxGroups[i][j]; 
                            console.log('here 2')
                            var snaps = snapshotsByTimeboxOid[timebox.get('ObjectID')];
                            console.log('here 3')
                            if (snaps && snaps.length > 0){
                                timebox.saveRollovers(snaps)
                            }
                        }
                    }
                    deferred.resolve(timeboxGroups);
                    
                },
                failure: function(msg){},
                scope: this 
            });   
            return deferred.promise; 
        },
        processSnaps: function(snapshots){
            var snapshots = _.flatten(snapshots);
            var snapsByTimeboxOid = _.reduce(snapshots, function(hash,snap){
                var tbOid = snap.get('ObjectID');
                if (!hash[tbOid]){
                    hash[tbOid] = [];
                }
                hash[tbOid].push(snap.data)
                return hash; 
            },{});
            return snapsByTimeboxOid;
        },
        fetchSnapshots: function(filters, status,dataContext){
            var key = 'Loading rolled over stories';
            var fields = ['Iteration', '_ValidFrom', '_ValidTo', 'ObjectID','AcceptedDate','FormattedID','_PreviousValues.Iteration','FormattedID'];
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