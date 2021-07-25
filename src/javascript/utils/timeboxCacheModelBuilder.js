Ext.define('TimeboxCacheModelBuilder',{
    singleton: true,

    build: function(modelType, newModelName,historicalCacheFieldName) {
        var deferred = Ext.create('Deft.Deferred');

        Rally.data.ModelFactory.getModel({
            type: modelType,
            success: function(model) {

                var default_fields = [{
                    name: historicalCacheFieldName,
                    defaultValue: null,
                    type: 'object'
                }];

                var new_model = Ext.define(newModelName, {
                    extend: model,
                    fields: default_fields,
                    resetDefaults: function(){
                        this.set('__ratioInProgress',-1);
                        this.set('__halfAcceptedRatio', -1);
                        this.set('__halfAcceptedDate','');
                        this.set('__endCompletionRatio', -1);
                        this.set('__endAcceptanceRatio'-1);
                        this.set('__endIncompletionRatio',-1);
                        this.set('__taskChurn', -2);
                        this.set('__scopeChurn', -2);
                        this.set('__velocityVariance',null);
                        this.set('__cycleTime',-2);

                    }
                });
                deferred.resolve(new_model);
            }
        });
        return deferred;
    }
});