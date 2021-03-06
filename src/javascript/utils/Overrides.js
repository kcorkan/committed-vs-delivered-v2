Ext.override(Rally.app.App, {
    /**
     * OVERRIDE: PreferenceManager.update returns records, not an updated settings
     * hash. This method in the SDK appears to simply apply the wrong data
     * to this.settings
     */

    /**
     * Update the settings for this app in preferences.
     * Provide a settings hash and this will update existing prefs or create new prefs.
     * @param options.settings the settings to create/update
     * @param options.success called when the prefs are loaded
     * @param options.scope scope to call success with
     */
    updateSettingsValues: function(options) {
        Rally.data.PreferenceManager.update(Ext.apply(this._getAppSettingsLoadOptions(), {
            requester: this,
            settings: options.settings,
            success: function(updatedSettings) {
                var updatedSettingsHash = _.reduce(updatedSettings, function(accumulator, updatedSetting) {
                    accumulator[updatedSetting.get('Name')] = updatedSetting.get('Value');
                    return accumulator;
                }, {});
                Ext.apply(this.settings, updatedSettingsHash);

                if (options.success) {
                    options.success.call(options.scope);
                }
            },
            scope: this
        }));
    }
})

Ext.override(CArABU.technicalservices.FileUtilities,{
    convertDataArrayToCSVText: function(data_array, requestedFieldHash) {

        var text = '';
        Ext.each(Object.keys(requestedFieldHash), function(key) {
            text += requestedFieldHash[key] + ',';
        });
        text = text.replace(/,$/, '\n');

        Ext.each(data_array, function(d) {
            Ext.each(Object.keys(requestedFieldHash), function(key) {
                if (d[key]) {
                    if (typeof d[key] === 'object') {
                        if (key === 'Owner'){
                            console.log('key',d[key]);
                        }
                        if (d[key].FormattedID) {
                            text += Ext.String.format("\"{0}\",", d[key].FormattedID);
                        }
                        else if (d[key].Name) {
                            text += Ext.String.format("\"{0}\",", d[key].Name);
                        }
                        else if (d[key].EmailAddress){  //Adding for user fields 
                            text += Ext.String.format("\"{0}\",", d[key].EmailAddress);
                        }
                        else if (!isNaN(Date.parse(d[key]))) {
                            text += Ext.String.format("\"{0}\",", Rally.util.DateTime.formatWithDefaultDateTime(d[key]));
                        }
                        else if (d[key]._refObjectName){  //Adding for user fields 
                            text += Ext.String.format("\"{0}\",", d[key]._refObjectName);
                        }
                        else {
                            text += Ext.String.format("\"{0}\",", d[key].toString());
                        }
                    }
                    else {
                        text += Ext.String.format("\"{0}\",", d[key]);
                    }
                }
                else {
                    text += ',';
                }
            }, this);
            text = text.replace(/,$/, '\n');
        }, this);
        return text;
    },
});