Ext.define("Rally.app.CommittedvsDeliveredv2", {
    extend: 'Rally.app.App',
    componentCls: 'app',
    layout: {
        type: 'vbox',
        align: 'stretch'
    },
    items: [{
            id: Utils.AncestorPiAppFilter.RENDER_AREA_ID,
            xtype: 'container',
            layout: {
                type: 'hbox',
                align: 'middle',
                defaultMargins: '0 10 10 0',
            }
        },
        {
            xtype: 'container',
            itemId: 'controls-area',
            layout: 'hbox'
        },
        {
            xtype: 'container',
            itemId: 'filters-area',
        },
        {
            id: 'grid-area',
            xtype: 'container',
            flex: 1,
            type: 'vbox',
            align: 'stretch'
        }
    ],
    config: {
        defaultSettings: {
            artifactType: 'HierarchicalRequirement',
            timeboxType: Constants.TIMEBOX_TYPE_ITERATION,
            timeboxCount: 5,
            planningWindow: 2,
            currentTimebox: true,
            historicalCacheField: null,
            timeboxStartDateField: 'StartDate',
            timeboxEndDateField: 'EndDate',
            saveCacheToTimebox: true,
            excludeAcceptedBeforeStart: false,
            showBySumOfEstimate: true,
            minDurationInHours: 24,
            showClearCache: false

        }
    },

    integrationHeaders: {
        name: "committed-vs-delivered-v2"
    },

    currentData: [],
    settingsChanged: false,

    onTimeboxScopeChange: function(scope) {
        this.callParent(arguments);
        this.viewChange();
    },

    launch: function() {
        if (this.getSaveCacheToTimebox() === true && this.getHistorcalCacheField() === null){
            this._showAppMessage("Please configure a historical cache field or turn off caching.");
            return; 
        }

        this.setTimeboxFieldsForType(this.getTimeboxType());
        this.setModelFieldsForType(this.getSetting('artifactType'));
        
        var promises = [
            this.isProjectHighLevel(),
            TimeboxCacheModelBuilder.build(this.getTimeboxType(),this.getTimeboxType() + "_x",this.getHistorcalCacheField(),this.timeboxStartDateField, this.timeboxEndDateField, this.getExcludeAcceptedBeforeStart())
        ];

        Deft.Promise.all(promises).then({
            scope: this,
            success: function(results) {
                this.projectIsHighLevel = results[0]; //Setting to determine if we show filters or not
                this.timeboxModel = results[1];
                this.viewChange();
            },
            failure: function(msg) {
                this._showError(msg);
            }
        });
    },
    getExcludeAcceptedBeforeStart: function(){
        return this.getSetting('excludeAcceptedBeforeStart') == "true" || this.getSetting('excludeAcceptedBeforeStart') === true;
    },
    getTimeboxType: function(){
        return this.getSetting('timeboxType');
    },
    isProjectHighLevel: function(){
        var deferred = Ext.create('Deft.Deferred');
        Ext.create('Rally.data.wsapi.Store', {
            model: 'Project',
            fetch: ['Name','Parent','Children'],
            autoLoad: false,
            pageSize: 1, 
            filters: {
                "property": "Parent.Parent.ObjectID",
                "value": this.getContext().getProject().ObjectID 
            }
        }).load({
            callback: function(records, operation, store){
                if (operation.wasSuccessful()){
                    var isProjectHighLevel = records.length > 0; 
                    deferred.resolve(isProjectHighLevel);
                } else {
                    deferred.reject("Error calculating project level");
                }
            }
        });
        return deferred.promise;
    },
    _showError: function(msg){
        Rally.ui.notify.Notifier.showError({message: msg});
    },
    _showAppMessage: function(msg){
        this.removeAll();
        this.add({
            xtype: 'container',
            html: Ext.String.format('<div class="no-data-container"><div class="secondary-message">{0}</div></div>',msg)
        });
    },
    setModelFieldsForType: function(artifactType) {
        this.modelName = artifactType;
        this.acceptedDateField = 'AcceptedDate';
        if (this.isPiTypeSelected()) {
            this.acceptedDateField = 'ActualEndDate'
        }
    },
    getDeliveredDateField: function(){
        return this.acceptedDateField;
    },
    getMinDurationInHours: function(){
        return this.getSetting('minDurationInHours') || 0;
    },
    getPointsField: function(){
        //if (this.getSetting('showBySumOfEstimate') === "true" || this.getSetting('showBySumOfEstimate') === true){
            var field = "PlanEstimate";
            if (this.isPiTypeSelected()){
                field = "LeafStoryPlanEstimateTotal";
            }
            return field;
        //}
        //return null;
    },
    setTimeboxFieldsForType: function(timeboxType) {
        this.timeboxType = timeboxType;

        if (this.timeboxType == Constants.TIMEBOX_TYPE_RELEASE) {
            this.timeboxStartDateField = 'ReleaseStartDate';
            this.timeboxEndDateField = 'ReleaseDate';
        }
        else if (this.timeboxType == Constants.TIMEBOX_TYPE_ITERATION) {
            this.timeboxStartDateField = 'StartDate';
            this.timeboxEndDateField = 'EndDate'
        }
    },
    getShowControls: function(){
        return this.projectIsHighLevel === false;
    },
    clearCache: function(){
        var timeboxes = this.timeboxes; 
        var count =0,
            success = 0, 
            total = timeboxes.length;
        this.setLoading("Clearing Timebox cache...");
        for (var i=0; i<timeboxes.length; i++){
            timeboxes[i].clearCache();
            timeboxes[i].save({
                callback: function(record,operation){
                    count++;
                    if (operation.wasSuccessful()){
                        success++; 
                        this.setLoading(Ext.String.format("Saving {0}/{1} timeboxes...",success,total));
                    }
                    if (count >= total){
                        this.setLoading(false);
                        Rally.notify.Notifier.show({message: Ext.String.format("{0}/{1} timeboxes cleared.",success,total)})
                    }
                },
                scope: this 
            })
        }
        // this.setLoading("Clearing timebox cache...")
        // if (timeboxes.length > 0 && this.getSaveCacheToTimebox()){
        //     var store = Ext.create('Rally.data.wsapi.batch.Store', {
        //         data: timeboxes
        //     });
        //     store.sync({
        //         success: function(batch,options) {
        //             Rally.ui.notify.Notifier.show({message: Ext.String.format("{0} timebox records updated successfully.",timeboxes.length)});
        //             this.setLoading(false);
        //         },
        //         failure: function(batch,options){
        //             this._showError("timeboxRecords update failed with error.");
        //             this.setLoading(false);
        //         },
        //         scope: this 
        //     });
        // }
    },
    getShowClearCache: function(){
        if (this.getSaveCacheToTimebox() ){
            return this.getSetting('showClearCache') == "true" || this.getSetting('showClearCache') === true; 
        }
       return false;
    },
    /**
     * Return a promise that resolves once the controls are initialized and
     * have initial values
     */
    addControls: function() {
        var filterDeferred = Ext.create('Deft.Deferred');
        var context = this.getContext();
        var controlsArea = this.down('#controls-area');
        controlsArea.removeAll();
        
        if (this.getShowClearCache()){
            controlsArea.add({
                xtype: 'rallybutton',
                iconCls: 'icon-refresh',
                handler: this.clearCache,
                scope: this 
            });    
        }
        controlsArea.add({
            xtype: 'container',
            flex: 1 
        });

        var exportMenu = [{
            text: 'Export to CSV...',
            handler: this.exportCacheData,
            scope: this
            }];
        if (this.getShowControls()){
        
            controlsArea.add({
                xtype: 'tsfieldpickerbutton',
                margin: '0 10 0 0',
                toolTipConfig: {
                    html: 'Columns to Export',
                    anchor: 'top'
                },
                getTitle: function() {
                    return 'Export Columns';
                },
                modelNames: [this.modelName],
                _fields: this.isPiTypeSelected() ? Constants.PI_DEFAULT_FIELDS : Constants.STORY_DEFAULT_FIELDS,
                context: context,
                stateful: true,
                stateId: context.getScopedStateId(this.modelName + 'fields'), // columns specific to type of object
                // Always need the accepted date field
                alwaysSelectedValues: Constants.ALWAYS_SELECTED_FIELDS.concat(this.acceptedDateField),
                listeners: {
                    fieldsupdated: function(fields) {
                        this.viewChange();
                    },
                    scope: this
                }
            });
            exportMenu.push({
                text: 'Export to CSV with details...',
                handler: this.exportCacheDataWithDetails,
                scope: this
            });
        }
        controlsArea.add({
                xtype: 'rallybutton',
                style: { 'float': 'right' },
                cls: 'secondary rly-small',
                frame: false,
                itemId: 'actions-menu-button',
                iconCls: 'icon-export',
                listeners: {
                    click: function(button) {
                        var menu = Ext.widget({
                            xtype: 'rallymenu',
                            items: exportMenu
                        });
                        menu.showBy(button.getEl());
                        if (button.toolTip) {
                            button.toolTip.hide();
                        }
                    },
                    scope: this
                }
        });
        filterDeferred.resolve();
       

        return filterDeferred.promise;
    },
    getPlanningWindow: function(){
        return this.getSetting('planningWindow') || 0;
    },
    exportCacheData: function(fields){
        var timeboxes = this.timeboxes,
            detailOids = []; 

        var dataArray = _.reduce(timeboxes, function(arr, tb){
            var cacheExportObjects = tb.getCacheDataForExport(this.getPlanningWindow(), this.getMinDurationInHours(),this.getExcludeAcceptedBeforeStart())
            arr = arr.concat(cacheExportObjects);
        return arr;  
        },[],this); 
        detailOids = _.pluck(dataArray,'ObjectID');
        if (fields && fields.length > 0){
            this.fetchDetailData(detailOids,fields, dataArray).then({
                success: function(newDataArray){
                    this.exportFile(newDataArray,fields);
                },
                failure: function(msg){
                    this._showError("Failed to fetch details for export file.  Exporting without details...");
                    this.exportFile(dataArray,fields);
                },
                scope: this 
            });
        } else {
            this.exportFile(dataArray);
        }
        
    },
    exportFile: function(dataArray, fields){
        if (dataArray.length > 0){      
            var fileName = Ext.String.format("plannedDelivered_{0}.csv",Rally.util.DateTime.format(new Date(),"Ymd_His"));
            var csvText = CArABU.technicalservices.FileUtilities.convertDataArrayToCSVText(dataArray, TimeboxCacheModelBuilder.getExportFieldsHash(fields));
            CArABU.technicalservices.FileUtilities.saveCSVToFile(csvText, fileName);
        }
    },
    exportCacheDataWithDetails: function(){
        var fields = this.getFieldsFromButton();
        this.exportCacheData(fields);
    },
    fetchDetailData: function(detailOids,fields, dataArray){
        var deferred = Ext.create('Deft.Deferred');

        var filters = {
            property: 'ObjectID',
            operator: 'in',
            value: detailOids.join(",")
        }

        this.setLoading("Loading detail data for export...");
        Ext.create('Rally.data.wsapi.Store',{
            model: 'HierarchicalRequirement',
            filters: filters,
            fetch: fields,
            enablePostGet: true, 
            pageSize: 2000,
            limit: Infinity 
        }).load({
            callback: function(records,operation,success){

                if (operation.wasSuccessful()){
                    this.addDetailToDataArray(dataArray,fields,records);
                    this.setLoading(false);
                    deferred.resolve(dataArray);
                } else {
                    this.setLoading(false);
                    deferred.reject(operation && operation.error && operation.error.errors.join(", "));
                }
            },
            scope: this 
        });

        return deferred.promise; 
    },
    addDetailToDataArray: function(dataArray,fields,records){
        var hash = _.reduce(records, function(hash,r){
            hash[r.get('ObjectID')] = r.getData();
            return hash;
        },{});
        for (var i=0; i< dataArray.length; i++){
            var detailRec = hash[dataArray[i].ObjectID] || {};
            for (var j=0; j<fields.length; j++){
                dataArray[i][fields[j]] = detailRec[fields[j]] || "";
                if (typeof dataArray[i][fields[j]] === 'object'){
                    dataArray[i][fields[j]] = dataArray[i][fields[j]]._refObjectName; 
                }
            }
        }
        return dataArray;  
    },
    getFieldsFromButton: function() {
        var fieldPicker = this.down('tsfieldpickerbutton');
        var result = [];
        if (fieldPicker) {
            result = fieldPicker.getFields();
        }
        return result;
    },

    onResize: function() {
        this.callParent(arguments);
        var gridArea = this.down('#grid-area');
        var gridboard = this.down('rallychart');
        if (gridArea && gridboard) {
            gridboard.setHeight(gridArea.getHeight() - Constants.APP_RESERVED_HEIGHT)
        }
    },
   
    _buildChartData: function(timeboxGroups){
        var planningWindow = this.getSetting('planningWindow');
        var chartData = {
            categories: [],
            series: [{
                dataLabels: {
                    enabled: true,
                    format: '{total} ' + Constants.COMMITTED,
                    inside: false,
                    y: -20,
                    overflow: 'justify'
                },
                name: Constants.UNPLANNED,
                data: [],
                legendIndex: 2,
                stack: 'planned'
            }, {
                name: Constants.PLANNED,
                data: [],
                legendIndex: 1,
                stack: 'planned'
            }, {
                dataLabels: {
                    enabled: true,
                    format: '{total} ' + Constants.DELIVERED,
                    inside: false,
                    y: -20,
                    overflow: 'justify'
                },
                name: Constants.UNPLANNED,
                data: [],
                showInLegend: false,
                stack: 'delivered'
            }, {
                name: Constants.PLANNED,
                data: [],
                showInLegend: false,
                stack: 'delivered'
            }]
        }

        var numTimeboxGroups = timeboxGroups.length;
        var minDurationInHours = this.getMinDurationInHours(),
            excludeAcceptedBeforeStart = this.getExcludeAcceptedBeforeStart();
        for (var i=numTimeboxGroups-1; i>=0; i--){
            if (timeboxGroups[i].length > 0){
                var unplanned = 0,
                    committed = 0,
                    unplannedDelivered = 0,
                    committedDelivered = 0;

                chartData.categories.push(timeboxGroups[i][0].get('Name'));
                for (var j=0; j<timeboxGroups[i].length; j++){
                    var metrics = timeboxGroups[i][j].getPlannedDeliveredMetrics(planningWindow,minDurationInHours,excludeAcceptedBeforeStart);
                    unplanned += metrics.unplanned;
                    committed += metrics.planned;
                    unplannedDelivered += metrics.unplannedDelivered;
                    committedDelivered += metrics.plannedDelivered; 
                } //end for timeboxGroups[i].length 
                chartData.series[0].data.push(unplanned);
                chartData.series[1].data.push(committed);
                chartData.series[2].data.push(unplannedDelivered);
                chartData.series[3].data.push(committedDelivered);
            }
        }
        return chartData;
    },
    
    getTimeboxes: function() {
        // Get the N most recent timeboxes in the current project
        // Sort by name
        // Get timeboxes by name from all child projects
    
        var timeboxFilterProperty = this.timeboxEndDateField;
        if (this.getSetting('currentTimebox')) {
            timeboxFilterProperty = this.timeboxStartDateField;
        }
        return Ext.create('Rally.data.wsapi.Store', {
            model: this.timeboxModel || this.timeboxType,
            autoLoad: false,
            context: {
                projectScopeDown: false,
                projectScopeUp: false
            },
            sorters: [{
                property: timeboxFilterProperty,
                direction: 'DESC'
            }],
            filters: [{
                property: timeboxFilterProperty,
                operator: '<=',
                value: 'today'
            }],
            pageSize: this.getSetting('timeboxCount')
        }).load().then({
            scope: this,
            success: this.fetchTimeboxes
        });
    },
    buildHistoricalCache: function(timeboxes) {
        // Group by timebox name
     
        var dataContext = this.getContext().getDataContext();
        dataContext.includePermissions = false; 
        this.timeboxes = timeboxes; 
        return Ext.create('TimeboxHistoricalCacheFactory',{
            timeboxType: this.getSetting('timeboxType'),
            dataContext: dataContext,
            saveCacheToTimebox: this.getSaveCacheToTimebox(),
            deliveredDateField: this.getDeliveredDateField(),
            modelNames: ['HierarchicalRequirement'],
            pointsField: this.getPointsField(),
            listeners: {
                status: function(msg){
                    this.setLoading(msg);
                },
                load: function(){
                    this.setLoading(false);
                },
                scope: this 
            }
        }).build(timeboxes);
    },
    getSaveCacheToTimebox: function(){
        return this.getSetting('saveCacheToTimebox') === true || this.getSetting('saveCacheToTimebox') === "true" || false;
    },
    getHistorcalCacheField: function(){
        return this.getSetting('historicalCacheField');
    },
    fetchTimeboxes: function(timeboxes, operation){
        var deferred = Ext.create('Deft.Deferred');
        
        this.setLoading('Loading Timeboxes...');
        var promises = _.map(timeboxes, function(timebox){
            var tbFilter = Rally.data.wsapi.Filter.and([{
                property: 'Name',
                value: timebox.get('Name')
            }, {
                property: this.timeboxStartDateField,
                value: timebox.get(this.timeboxStartDateField)
            }, {
                property: this.timeboxEndDateField,
                value: timebox.get(this.timeboxEndDateField)
            }]);
            return this.fetchTimeboxGroup(tbFilter);
        },this);

        Deft.Promise.all(promises).then({
            scope: this,
            success: function(results){
                deferred.resolve(_.flatten(results));
            },
            failure: function(msg){
                deferred.reject("Error loading timeboxes");
            }
        }).always(function(){
            this.setLoading(false);
        },this);
        return deferred.promise;       
    },
    fetchTimeboxGroup: function(timeboxFilters){
        var dataContext = this.getContext().getDataContext();
        dataContext.includePermissions = false; 
 
        return Ext.create('Rally.data.wsapi.Store', {
            model: this.timeboxModel,
            autoLoad: false,
            pageSize: 2000,
            context: dataContext,
            limit: Infinity,
            fetch: ['ObjectID', this.timeboxStartDateField, this.timeboxEndDateField, 'Name',this.getHistorcalCacheField(),'Project'],
            enablePostGet: true,
            includePermissions: false,
            sorters: [{
                property: this.timeboxEndDateField,
                direction: 'DESC'
            }],
            filters: timeboxFilters
        }).load();
    },
    getTimeboxFilter: function(timeboxes,operation){
        var timeboxFilter = _.map(timeboxes, function(timebox) {
            return Rally.data.wsapi.Filter.and([{
                property: 'Name',
                value: timebox.get('Name')
            }, {
                property: this.timeboxStartDateField,
                value: timebox.get(this.timeboxStartDateField)
            }, {
                property: this.timeboxEndDateField,
                value: timebox.get(this.timeboxEndDateField)
            }]);
        }, this);
        if (timeboxFilter.length) {
            return Rally.data.wsapi.Filter.or(timeboxFilter)
        }
        else {
            return null;
        }
    },
    _addChart: function(chartConfig){
        var chartArea = this.down('#grid-area')
        chartArea.removeAll();

        chartArea.add(chartConfig);
    },
    getChartTitle: function(){
        return this.getSetting('artifactType');
    },
    isPiTypeSelected: function() {
        var type = this.getSetting('artifactType');
        if (type.match(/PortfolioItem/)){
            return true; 
        }
        return false; 
    },
    viewChange: function() {
        this.setLoading(true);
        // Add the other filter, config and export controls
        this.addControls().then({
            scope: this,
            success: this.getTimeboxes
        }).then({
            scope: this,
            success: this.buildHistoricalCache
        }).then({
            scope: this,
            success: function(timeboxGroups) {
                this.timeboxGroups = timeboxGroups;
                this._rebuildChart(timeboxGroups);
                this.setLoading(false);
            }
        });
    },

    _rebuildChart: function(timeboxGroups){
        var chartData = this._buildChartData(timeboxGroups);
        var chartConfig = this._buildChartConfig(chartData);
        this._addChart(chartConfig);
    },
    _buildChartConfig: function(chartData){
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
                    text: Constants.CHART_TITLE + ' by ' + this.timeboxType
                },
                legend: {
                    layout: 'vertical',
                    labelFormatter: function() {
                        var result = this.name;
                        if (this.name == Constants.UNPLANNED) {
                            var app = Rally.getApp();
                            var timeboxType = app.getSetting('timeboxType');
                            var days = app.getSetting('planningWindow');
                            result = this.name + ' (' + Constants.UNPLANNED_DESCRIPTION.replace('{timebox}', timeboxType).replace('{days}', days) + ')'
                        }
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
                        text: Constants.Y_AXIS_TITLE
                    }
                }
            },
            chartData: chartData 
        }
    },
    onSettingsClose: function() {
        // Don't redraw the app unless something has changed
        if (this.settingsChanged) {
            this.settingsChanged = false;
            this.viewChange();
        }
    },

    updateSettingsValues: function(options) {
        this.settingsChanged = true;
        this.callParent(arguments);
    },

    getModelScopedStateId: function(modelName, id) {
        return this.getContext().getScopedStateId(modelName + '-' + id);
    },
    hideCacheSettings: function(hide){
        this.up().down('#historicalCacheField').setDisabled(hide);
        this.up().down('#showClearCache').setDisabled(hide);
    },
    getSettingsFields: function(){
        var timeboxTypeStore = Ext.create('Ext.data.Store', {
            fields: ['name', 'value'],
            data: [
                { name: Constants.TIMEBOX_TYPE_ITERATION_LABEL, value: Constants.TIMEBOX_TYPE_ITERATION }
              //  { name: Constants.TIMEBOX_TYPE_RELEASE_LABEL, value: Constants.TIMEBOX_TYPE_RELEASE },
            ]
        });
        var labelWidth = 200,
            labelAlign = 'right';

        var showCache = this.getSetting('saveCacheToTimebox');
        return [{
            xtype: 'rallycombobox',
                name: 'timeboxType',
                id: 'timeboxType',
                fieldLabel: 'Timebox type',
                labelWidth: labelWidth,
                store: timeboxTypeStore,
                queryMode: 'local',
                displayField: 'name',
                valueField: 'value',
                labelAlign: labelAlign
        },{
            xtype: 'rallycombobox',
            name: 'artifactType',
            fieldLabel: 'Artifact type',
            labelWidth: labelWidth,
            storeConfig: {
                model: "TypeDefinition",
                fetch: ['TypePath','Name'],
                filters: {
                    property: "TypePath",
                    value: "HierarchicalRequirement"
                }
            },
            displayField: 'Name',
            valueField: 'TypePath',
            labelAlign: labelAlign
        },{
            xtype: 'rallynumberfield',
            name: 'timeboxCount',
            fieldLabel: "Timebox Count",
            labelWidth: labelWidth,
            minValue: 1,
            allowDecimals: false,
            labelAlign: labelAlign
        },{
            xtype: 'rallynumberfield',
            name: 'planningWindow',
            fieldLabel: 'Timebox planning window (days)',
            labelWidth: labelWidth,
            minValue: 0,
            allowDecimals: false,
            labelAlign: labelAlign
        },{
            xtype: 'rallycheckboxfield',
            name: 'currentTimebox',
            fieldLabel: 'Show current, in-progress timebox',
            labelWidth: labelWidth,
            labelAlign: labelAlign
        },{
            xtype: 'rallycheckboxfield',
            name: 'excludeAcceptedBeforeStart',
            fieldLabel: 'Exclude Work Items accepted before the Iteration',
            labelWidth: labelWidth,
            labelAlign: labelAlign
        },{
            xtype: 'rallycheckboxfield',
            name: 'showBySumOfEstimate',
            fieldLabel: 'Show sum of Plan Estimate',
            labelWidth: labelWidth ,
            labelAlign: labelAlign
        },{
            xtype: 'rallynumberfield',
            name: 'minDurationInHours',
            fieldLabel: 'Minimum number of hours an item spends in the timebox to be included',
            labelWidth: labelWidth ,
            labelAlign: labelAlign
        },{
            xtype: 'rallycheckboxfield',
            name: 'saveCacheToTimebox',
            fieldLabel: 'Save Cache',
            labelWidth: labelWidth,
            bubbleEvents: ['change'],
            labelAlign: labelAlign,
            listeners: {
                change: function(cb,newValue){
                    this.hideCacheSettings(!newValue);
                },
                scope: this
            }
        },{
            xtype: 'rallyfieldcombobox',
                name: 'historicalCacheField',
                fieldLabel: 'Historical Cache Field',
                itemId: 'historicalCacheField',
                model: 'Iteration',
                labelWidth: labelWidth + 50,
                displayField: 'DisplayName',
                valueField: 'Name',
                disabled: !showCache, 
                _isNotHidden: function(field) {
                    if (field.hidden){
                        if (field && field.attributeDefinition && field.attributeDefinition.AttributeType.toLowerCase() === "text"){
                            return true; 
                        }
                    }
                    return false;
                },
                labelAlign: labelAlign
        },{
            xtype: 'rallycheckboxfield',
            name: 'showClearCache',
            fieldLabel: 'Enable Clear Cache',
            itemId: 'showClearCache',
            labelWidth: labelWidth  + 50,
            disabled: !showCache, 
            labelAlign: labelAlign
        }];
    }
});
