Ext.define('RolloverCalculator', {
    statics: {
        SERIES_NAME: ["0","1","2","3","4","5+"],
        SERIES_COLOR: ["#66b3ff","#79ff4d","#ffb84d","#ff1a75","#00e68a","#ac39ac"],
        Y_AXIS_TITLE: "Story Count",
        CHART_TITLE: "This chart title",
        
        getChartData: function(timeboxGroups){
            var artifactHash = {},
            timeboxNames = []; 
            for (var i=0; i<timeboxGroups.length; i++){
                var timeboxes = timeboxGroups[i];
                timeboxNames.push(timeboxes[0].get('Name'));
                for (var j=0; j<timeboxes.length; j++){
                    var timebox = timeboxes[j],
                        cache = timebox.getCacheObject(); 
                        artifactHash = _.reduce(cache.data, function(hash, info,oid){
                            
                            if (!hash[oid]){
                                hash[oid] = [];
                            } 
                            hash[oid].push(timebox.get('Name'));
                            return hash; 
                        },artifactHash);            
                } //end timeboxes 
            } //end timeboxGroups 
            console.log('artifactHash',artifactHash)       
            
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
    
            for (var i=0; i<timeboxNames.length; i++){
                var tbName = timeboxNames[i];
                for (var j=0;j<chartData.series.length; j++){ chartData.series[j].data[i] = 0; }
                _.each(artifactHash, function(timeboxes,artifactOid){
                    var idx = timeboxes.indexOf(tbName);
                    if (idx >= 0){
                        chartData.series[idx].data[i]++;
                    }
                });
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
        }
    }
});