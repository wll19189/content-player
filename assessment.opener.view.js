/**
 * assessment.opener.view.js
 *
 * Layout for assessment opener.
*/
define([
    'underscore',
    'backbone',
    'marionette',
    'util/handlebars.helpers',
    'util/utils',
    'conceptUtil/assessment.utils',
    'enums/events',
    'views/tools/analytics',
    'enums/analytics/analyticsEventType',
    'models/assessment.attempt.model'

], function (_, Backbone, Marionette, Helpers, Utils, AssessmentUtils, Events, Analytics, AnalyticsEventType,
              AttemptModel) {

        return Marionette.ItemView.extend({
            template: 'assessment/opener/assessment.opener.view',

            events: {
                "click .review-button": "reviewAssessmentAttempt",
                "click .begin-button": "beginAssessment",
                "click .retake-button": "retakeAssessment",
                "click .teacher-preview-button": "previewAssessment",
                'click button.accordion-toggle': 'revealContentToggle'
            },

            ui: {
                beginButton: 'button.begin-button'
            },

            initialize: function(opts) {

                _.bindAll(this, 'retakeAssessment');

                if (opts.attemptModel !== false && opts.attemptModel){
                    this.model.set('isAlreadyTaken', true);
                    this.model.set('attemptModel', opts.attemptModel.attributes);
                }else {
                    this.model.set('isAlreadyTaken', false);
                }

                console.log("Initializing assessment opener view for assessment: " + this.model.get('contentId'));

                this.allQuestions = this.model.get('allQuestions');

                this.totalQuestions = this.allQuestions.length;

                var estimatedTime = this.model.get('estimatedTimeSeconds') / 60000;

                this.model.set("estimatedTime", estimatedTime);
                this.model.set("totalQuestions", this.totalQuestions);

                if (this.model.get('gradingScheme') === 1){
                    this.model.set("scoreMethod", "Computer Graded");
                } else if (this.model.get('gradingScheme') === 2){
                    this.model.set("scoreMethod", "Manual Graded");
                } else if (this.model.get('gradingScheme') === 3){
                    this.model.set("scoreMethod", "Computer and Manual Graded");
                }

                this.model.set("isListAttemptsExpanded",
                        CP30.appStateModel.getAttemptsListPosition(this.model.get('contentId')));

                Helpers.registerGetDatetimeFromTimestamp();
            },

            onShow: function() {

                Utils.updateLiveMessage('Assessment Start Page', null, true);
            },

            beginAssessment: function() {
                console.log("first question");

                this.startNewAssessmentAttempt(function() {

                    CP30.appStateModel.cleanAnswerSheet(this.model.get('contentId'));

                    var route = "",
                        firstQuestionId = this.model.getQuestionIdAtPosition(0);

                    this.model.set('isSubmitted', false);

                    route = AssessmentUtils.getAssessmentQuestionRoute(firstQuestionId);

                    CP30.router.navigate(route, {trigger: true});

                });
            },

            retakeAssessment: function() {
                this.beginAssessment();
            },

            revealContentToggle: function(e) {
                e.preventDefault();

                var $el = $(e.currentTarget),
                    glyphicon = $el.find('i.glyphicon'),
                    sectionContainer = $el.parent().parent().find('.section-container');

                if (sectionContainer.hasClass("collapsing")) {
                    return;
                }

                if (sectionContainer.css('display') === 'none') {
                    glyphicon.removeClass('glyphicon-chevron-right').addClass('glyphicon-chevron-down');
                    CP30.appStateModel.setIsAttemptsListExpanded(this.model.get('contentId'), true);
                }else {
                    glyphicon.removeClass('glyphicon-chevron-down').addClass('glyphicon-chevron-right');
                    CP30.appStateModel.setIsAttemptsListExpanded(this.model.get('contentId'), false);
                }

            },

            reviewAssessmentAttempt: function(event) {

                var $el = $(event.target);
                CP30.vent.trigger(Events.ASSESSMENT_SHOW_REVIEW, $el.attr('data-attempt-id'));

            },

            previewAssessment: function() {
                CP30.vent.trigger(Events.ASSESSMENT_SHOW_PREVIEW);
            },

            startNewAssessmentAttempt: function(callback) {

                var self = this,
                    attemptModel = new AttemptModel({assessmentId: this.model.get('contentId'),
                                                     assessmentVersion: this.model.get('contentVersion')});
                Utils.showLoading();

                attemptModel.fetch({
                    type: 'GET',
                    parse: false,
                    success: function(model) {
                        Utils.hideLoading();

                        self.model.set('newAttemptModel', model);

                        if (callback && typeof(callback) === 'function'){
                            callback.call(self);
                        }

                    }
                });
            }

        });
    }
);
