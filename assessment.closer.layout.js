/**
 * assessment.closer.layout.js
 *
 * Layout for assessment closer.
 */

define(
    [
        'underscore',
        'backbone',
        'marionette',
        'views/assessment/closer/assessment.closer.header.view',
        'views/assessment/closer/assessment.closer.view',
        'enums/events',
        'util/constants',
        'models/assessment.lastAttempt.model',
        'models/navigation.lesson.model'
    ],
    function (_, Backbone, Marionette, AssessmentHeaderView, AssessmentCloserView, Events, Constants,
              LastAttemptModel, LessonNavigationModel) {

        return Marionette.LayoutView.extend({

            template: 'assessment/closer/assessment.closer.layout',

            regions: {
                header: '#cp-page-header',
                content: '#cp-page-layout'
            },

            initialize: function(options) {

                var self = this,
                    attemptModel;

                console.log("Initializing assessment closer layout");

                this.options = options;
                
                this.showCloseButton = options.showCloseButton;

                this.assessmentId = this.model.get('contentId');

                this.answerSheet = CP30.appStateModel.getAnswerSheet(this.assessmentId);

                CP30.appStateModel.get('questionNavigator').isNavigatorVisible = false;

                this.haveScoringData = true;

                this.lessonModel = new LessonNavigationModel();
                self.lessonModel.fetch({
                    success: function() {
                        self.setContinueButton();
                    }
                });

                // If coming from the submit button, the answerSheet will be populated, otherwise
                // retrieve the scoring data from the server.
                if (!this.answerSheet || this.answerSheet.get('scorePercent') === undefined) {
                    console.log("Fetching closer data");
                    this.haveScoringData = false;
                    attemptModel = new LastAttemptModel({id: this.model.get('id')});
                    attemptModel.fetch({
                        success: function(model) {
                            self.updateAnswerSheet(model);
                            self.showRegions(true);
                        }
                    });
                }
            },

            onRender: function () {

                if (this.haveScoringData) {
                    this.showRegions();
                }

                CP30.vent.trigger(Events.NAVIGATON_HIDE, !Constants.nav.SHOW_DIRECTIONAL_ARROWS);
            },

            showRegions: function(triggerShown) {

                this.header.show(new AssessmentHeaderView({model: this.model, showCloseButton: this.showCloseButton}));
                this.content.show(new AssessmentCloserView({model: this.model}));

                if (triggerShown) {
                    setTimeout(function() { CP30.vent.trigger(Events.ASSESSMENT_CLOSER_SHOWN); }, 0);
                }
            },
            
            setContinueButton: function() {
                var items = this.lessonModel.get("items");
                CP30.appStateModel.setDirectionalNavState(items);
            },

            updateAnswerSheet: function(lastAttemptModel) {

                this.answerSheet.set('scorePercent', lastAttemptModel.get('scorePercent'));
                this.answerSheet.set('score', lastAttemptModel.get('score'));
                this.answerSheet.set('totalPoints', lastAttemptModel.get('totalPoints'));
                this.answerSheet.set('attemptId', lastAttemptModel.get('attemptId'));
            }
        });
    }
);
