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
            saveCacheToTimebox: true 
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

        console.log('settings',this.getSettings());
        
        var promises = [
            this.isProjectHighLevel(),
            TimeboxCacheModelBuilder.build(this.getTimeboxType(),this.getTimeboxType() + "_x",this.getHistorcalCacheField(),this.timeboxStartDateField, this.timeboxEndDateField)
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
        console.log('_showError: ' + msg);
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
        
        for (var i=0; i<timeboxes.length; i++){
            timeboxes[i].clearCache();
        }
        if (timeboxes.length > 0 && this.getSaveCacheToTimebox()){
            var store = Ext.create('Rally.data.wsapi.batch.Store', {
                data: timeboxes
            });
            store.sync({
                success: function() {
                    Rally.ui.notify.Notifier.show({message: Ext.String.format("{0} timebox records updated successfully.",timeboxes.length)});
                },
                failure: function(){
                    this._showError("timeboxRecords update failed with error.");
                },
                scope: this 
            });
        }
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
        controlsArea.add({
            xtype: 'rallybutton',
            iconCls: 'refresh',
            handler: this.clearCache,
            scope: this 
        });
        if (this.getShowControls()){
            controlsArea.add([{
                xtype: 'rallyinlinefilterbutton',
                modelNames: [this.modelName],
                context: context,
                stateful: true,
                stateId: context.getScopedStateId(this.modelName + 'filters'), // filters specific to type of object
                inlineFilterPanelConfig: {
                    quickFilterPanelConfig: {
                        // Supply a list of Portfolio Item Types. For example `Rally.data.util.PortfolioItemHelper.getPortfolioItemTypes()`
                        //portfolioItemTypes: this.portfolioItemTypes,
                        // Set the TypePath of the model item that is being filtered. For example: 'PortfolioItem/Feature' or 'Defect'
                        modelName: this.modelName
                    }
                },
                listeners: {
                    scope: this,
                    inlinefilterready: function(panel) {
                        this.down('#filters-area').add(panel);
                    },

                    inlinefilterchange: function(cmp) {
                        if (filterDeferred.getState() == 'pending') {
                            // This is the first filter change event.
                            // This component fires change before it is fully added. Capture the
                            // reference to the filter button in the change handler so it can be used
                            // by loadPrimaryStories. Attempts to get to
                            // the button by using this.down('rallyinlinefilte/rbutton') will return null
                            // at this point.
                            this.filterButton = cmp;
                            filterDeferred.resolve();
                        }
                        else {
                            this.viewChange();
                        }
                    },
                }
            }, {
                xtype: 'container',
                flex: 1
            }, {
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
            }, {
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
                            items: [{
                                text: 'Export to CSV...',
                                handler: function() {
                                    this.exportCacheData();
                                    //var csvText = CArABU.technicalservices.FileUtilities.convertDataArrayToCSVText(this.currentData, this.getExportFieldsHash());
                                    //CArABU.technicalservices.FileUtilities.saveCSVToFile(csvText, 'comitted.csv');
                                },
                                scope: this
                            }]
                        });
                        menu.showBy(button.getEl());
                        if (button.toolTip) {
                            button.toolTip.hide();
                        }
                    },
                    scope: this
                }
            }]);
        } else {
            filterDeferred.resolve();
        }

        return filterDeferred.promise;
    },
    exportCacheData: function(){
        var timeboxes = this.timeboxes; 

        var dataArray = _.reduce(timeboxes, function(arr, tb){
            var cacheExportObjects = tb.getCacheDataForExport(0);
            arr = arr.concat(cacheExportObjects);
            return arr;  
        },[]);    
        if (dataArray.length > 0){      
            var csvText = CArABU.technicalservices.FileUtilities.convertDataArrayToCSVText(dataArray, TimeboxCacheModelBuilder.getExportFieldsHash());
            CArABU.technicalservices.FileUtilities.saveCSVToFile(csvText, 'comitted.csv');
        }
        
    },

    getFieldsFromButton: function() {
        var fieldPicker = this.down('tsfieldpickerbutton');
        var result = [];
        if (fieldPicker) {
            result = fieldPicker.getFields();
        }
        return result;
    },

    headerName: function(field) {
        var result;
        switch (field) {
            case "Iteration":
                result = 'Currently linked to Iteration'
                break;
            case "Release":
                result = 'Currently linked to Release'
                break;
            case 'timeboxName':
                result = this.timeboxType;
                break;
            case 'timeboxStartDate':
                result = this.timeboxType + ' Start Date';
                break;
            case 'timeboxEndDate':
                result = this.timeboxType + ' End Date';
                break;
            case 'timeboxAddedDate':
                result = 'Linked to ' + this.timeboxType + ' on';
                break;
            default:
                result = field;
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
        console.log('buildChartData',timeboxGroups)
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
        console.log("buildChartData ",  numTimeboxGroups);
        for (var i=numTimeboxGroups-1; i>=0; i--){
            if (timeboxGroups[i].length > 0){
                var unplanned = 0,
                    committed = 0,
                    unplannedDelivered = 0,
                    committedDelivered = 0;

                chartData.categories.push(timeboxGroups[i][0].get('Name'));
                for (var j=0; j<timeboxGroups[i].length; j++){
                    var metrics = timeboxGroups[i][j].getPlannedDeliveredMetrics(planningWindow);
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
    getChartConfig: function(data) {
        var sortedData = _.sortBy(data, function(datum) {
            return datum.timebox.get(this.timeboxStartDateField).toISOString();
        }, this);
        var timeboxNames = [];
        var plannedCommitted = [];
        var plannedDelivered = [];
        var unplannedComitted = [];
        var unplannedDelivered = [];
        this.currentData = [];
        _.each(sortedData, function(datum, index, collection) {
            var pc = 0,
                pd = 0,
                uc = 0,
                ud = 0;

            var timeboxName = datum.timebox.get('Name');
            // If this is the current in-progress timebox, annotate its name
            if (this.getSetting('currentTimebox') && index == collection.length - 1) {
                if (datum.timebox.get(this.timeboxEndDateField) >= new Date()) {
                    timeboxName = timeboxName + Constants.IN_PROGRESS;
                }
            }
            timeboxNames.push(timeboxName);

            if (datum.artifactStore) {
                datum.artifactStore.each(function(artifact) {
                    if (artifact.get('AcceptedBeforeTimeboxStart')) {
                        // Special case. The artifact was accepted before the timebox started. The work occurred
                        // *before* this timebox started and is NOT therefore included in the timebox as committed
                        // or delivered.
                    }
                    else {
                        this.currentData.push(artifact.data);
                        if (artifact.get('Planned')) {
                            pc++; // Committed and planned
                            if (artifact.get('Delivered')) {
                                pd++ // Planned and delivered
                            }
                        }
                        else {
                            uc++; // Comitted and unplanned 
                            if (artifact.get('Delivered')) {
                                ud++ // Unplanned and delivered
                            }
                        }
                    }
                }, this);
            }
            plannedCommitted.push(pc);
            plannedDelivered.push(pd);
            unplannedComitted.push(uc);
            unplannedDelivered.push(ud);
        }, this);

        var title = this.getChartTitle();
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
                    text: title + ' ' + Constants.CHART_TITLE + ' by ' + this.timeboxType
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
            chartData: {
                categories: timeboxNames,
                series: [{
                    dataLabels: {
                        enabled: true,
                        format: '{total} ' + Constants.COMMITTED,
                        inside: false,
                        y: -20,
                        overflow: 'justify'
                    },
                    data: unplannedComitted,
                    stack: 0,
                    legendIndex: 2,
                    name: Constants.UNPLANNED
                }, {
                    data: plannedCommitted,
                    stack: 0,
                    legendIndex: 1,
                    name: Constants.PLANNED
                }, {
                    dataLabels: {
                        enabled: true,
                        format: '{total} ' + Constants.DELIVERED,
                        inside: false,
                        y: -20,
                        overflow: 'justify'
                    },
                    data: unplannedDelivered,
                    stack: 1,
                    showInLegend: false,
                    name: Constants.UNPLANNED
                }, {
                    data: plannedDelivered,
                    stack: 1,
                    showInLegend: false,
                    name: Constants.PLANNED
                }]
            }
        }
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
            modelNames: ['HierarchicalRequirement']
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
        });
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
        console.log('_addChart',chartConfig);
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
    getSettingsFields: function(){
        console.log('getConfigItems');
        var artifactComboFilters = Rally.data.wsapi.Filter.and([{
            property: "TypePath",
            operator: "contains",
            value: "PortfolioItem/"
        },{
            property: "Ordinal",
            value: 1 
        }]).or({
            property: "TypePath",
            value: "HierarchicalRequirement"
        });

        var timeboxTypeStore = Ext.create('Ext.data.Store', {
            fields: ['name', 'value'],
            data: [
                { name: Constants.TIMEBOX_TYPE_ITERATION_LABEL, value: Constants.TIMEBOX_TYPE_ITERATION },
                { name: Constants.TIMEBOX_TYPE_RELEASE_LABEL, value: Constants.TIMEBOX_TYPE_RELEASE },
            ]
        });

        return [{
            xtype: 'rallycombobox',
                name: 'timeboxType',
                id: 'timeboxType',
                fieldLabel: 'Timebox type',
                labelWidth: 150,
                store: timeboxTypeStore,
                queryMode: 'local',
                displayField: 'name',
                valueField: 'value',
        },{
            xtype: 'rallycombobox',
            name: 'artifactType',
            //value: settings.artifactType,
            fieldLabel: 'Artifact type',
            labelWidth: 150,
            storeConfig: {
                model: "TypeDefinition",
                fetch: ['TypePath','Name'],
                filters: artifactComboFilters
            },
            displayField: 'Name',
            valueField: 'TypePath',
        },{
            xtype: 'rallynumberfield',
                name: 'timeboxCount',
                fieldLabel: "Timebox Count",
                labelWidth: 150,
                minValue: 1,
                allowDecimals: false,
        },{
            xtype: 'rallynumberfield',
            name: 'planningWindow',
            fieldLabel: 'Timebox planning window (days)',
            labelWidth: 150,
            minValue: 0,
            allowDecimals: false
        },{
            xtype: 'rallycheckboxfield',
            name: 'currentTimebox',
            fieldLabel: 'Show current, in-progress timebox',
            labelWidth: 150
        },{
            xtype: 'rallycheckboxfield',
            name: 'saveCacheToTimebox',
            fieldLabel: 'Save Cache',
            labelWidth: 150    
        },{
            xtype: 'rallyfieldcombobox',
                name: 'historicalCacheField',
                fieldLabel: 'Historical Cache Field',
                model: 'Iteration',
                labelWidth: 150,
                displayField: 'DisplayName',
                valueField: 'Name',
                _isNotHidden: function(field) {
                    if (field.hidden){
                        if (field && field.attributeDefinition && field.attributeDefinition.AttributeType.toLowerCase() === "text"){
                        
                            return true; 
                        }
                    }
                    return false;
                }
       
        }];
    }
});
