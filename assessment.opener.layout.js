/**
 * assessment.opener.layout.js
 *
 * Layout for assessment opener.
 */

define([
    'underscore',
    'backbone',
    'marionette',
    'models/question.model',
    'views/assessment/assessment.layout',
    'views/assessment/opener/assessment.opener.header.view',
    'views/assessment/opener/assessment.opener.view',
    'models/assessment.attempt.model'

], function (_, Backbone, Marionette, QuestionModel, AssessmentLayout, AssessmentOpenerHeaderView, AssessmentOpenerView,
        AttemptModel) {

        return Marionette.LayoutView.extend({

            template: 'assessment/opener/assessment.opener.layout',

            regions: {
                header: '#cp-page-header',
                content: '#cp-page-layout',
                footer: '#assessment-footer'
            },

            initialize: function() {
                console.log("Initializing opener layout");
                _.bindAll(this, 'processAttemptModel');
            },

            onRender: function () {
                this.showRegions();
            },

            showRegions: function() {
                var self = this,
                    attemptModel;

                this.header.show(new AssessmentOpenerHeaderView({model: this.model}));

                if (this.model.get('isPreviewMode')){
                    this.content.show(new AssessmentOpenerView({
                            model: this.model,
                            attemptModel: false
                        }));
                }else {
                    attemptModel = new AttemptModel({ assessmentId: this.model.get('contentId') });
                    attemptModel.fetch({
                        success: self.processAttemptModel
                    });
                }
            },

            processAttemptModel: function(model) {
                this.content.show(new AssessmentOpenerView({model: this.model,
                                                         attemptModel: model.get('attemptId') ? model : false }));
            }

        });
    }
);
