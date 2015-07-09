/**
 * assessment.closer.view.js
 *
 * View for assessment closer.
 */

define(
    [
        'underscore',
        'backbone',
        'marionette',
        'util/utils',
        'enums/events',
        'conf/configurations'
    ],
    function (_, Backbone, Marionette, Utils, Events, Config) {

        return Marionette.ItemView.extend({

            template: 'assessment/closer/assessment.closer.view',

            events: {
                'click .review-button': 'reviewAssessment',
                'click .continue-button': 'continueLesson'
            },
            
            ui: {
                continueButton: 'button.continue-button'
            },

            selectors: {
                closerWrapper: '.assessment-closer-wrapper'
            },

            initialize: function(options) {

                var self = this, resultMessage, mastered;

                this.options = options;

                this.assessmentId = this.model.get('contentId');

                console.log("Initializing assessment closer view for assessment: " + this.assessmentId);

                this.answerSheet = CP30.appStateModel.getAnswerSheet(this.assessmentId);

                mastered = this.answerSheet.get('scorePercent') >= Config.MASTERY_PCT;
                resultMessage = mastered ? "Awesome Job!" : "Not Mastered";

                this.model.set("points", this.answerSheet.get('score'));
                this.model.set("totalPoints", this.answerSheet.get('totalPoints'));
                this.model.set("scorePercent", this.answerSheet.get('scorePercent'));
                this.model.set('attemptId', this.answerSheet.get('attemptId'));
                this.model.set("resultMessage", resultMessage);
                this.model.set("mastered", mastered);
                this.model.set("isLastLO", CP30.appStateModel.get('isLastLO'));
                this.model.set("isSingleAssessment", CP30.appStateModel.get('isSingleAssessment'));
                this.listenTo(CP30.vent, Events.ASSESSMENT_CLOSER_SHOWN, function() {
                    self.$('.assessment-closer-wrapper').addClass('fade-in');
                });
            },

            onShow: function() {

                Utils.updateLiveMessage('Assessment Score Page');
            },

            reviewAssessment: function() {

                CP30.vent.trigger(Events.ASSESSMENT_SHOW_REVIEW, this.model.get('attemptId'));

            },
            
            continueLesson: function() {
                var route = CP30.appStateModel.get('nextPageUrl');
                CP30.router.navigate(route, {trigger: true});
            }
        });
    }
);
