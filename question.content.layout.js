/**
 * question.content.layout.js
 *
 * Layout for question content
 */

define([
    'underscore',
    'marionette',
    'cocktail',
    'conf/configurations',
    'util/utils',
    'models/question.model',
    'views/question/question.header.view',
    'views/question/navigator/preview.header.view',
    'views/question/types/question.mcsr.view',
    'views/question/types/question.mcmr.view',
    'views/question/types/question.fib.view',
    'views/question/types/question.match.view',
    'views/question/types/question.tf.view',
    'views/assessment/assessment.part.view',
    'conceptUtil/question.utils',
    'models/answer.model',
    'enums/questionType',
    'enums/feedbackType',
    'enums/deliveryType',
    'enums/audienceType',
    'enums/events',
    'mixins/mathml'
], function (_, Marionette, Cocktail, Config, Utils, QuestionModel, QuestionHeaderView, QuestionHeaderPreview,
             McsrQuestionView, McmrQuestionView, FibQuestionView, MatchingQuestionView, TrueFalseQuestionView,
             AssessmentPartView, QuestionUtils, AnswerModel, QuestionType, FeedbackType, DeliveryType,
             AudienceType, Events, MathMLMixin) {

        return Marionette.LayoutView.extend({

            template: 'question/question.content.layout',

            regions: {
                content: '.question-content-specific',
                questionPartContent: '.question-part-content',
                navigatorPartContent: '.question-navigator-part-content'
            },

            selectors: {
                inputs: ':input',
                feedback: '.feedback-heading',
                questionContent: '.question-content'
            },

            initialize: function(options) {

                this.options = options;

                this.assessmentModel = options.assessmentModel;
                this.attemptModel = options.attemptModel;
                this.isNavigator = options.isNavigator;
                this.isReview = options.isReview;
                this.isPreviewMode = options.isPreviewMode;

                this.questionType = QuestionType.getByType(this.model.get('typeName'));

                if (this.isReview){
                    if (this.isPreviewMode) {
                        // In preview mode, all feedback is 'Correct' because we're showing the correct answers.
                        this.feedbackType = FeedbackType.CORRECT;
                    } else {
                        this.feedbackType = QuestionUtils.getFeedbackType(this.model);
                    }
                }

                if (this.isPreviewMode){
                    this.model.set('actualPoints', this.model.get('points'));
                } else if (this.isReview) {
                    this.model.set('actualPoints', this.getActualPoints());
                }

                this.model.set("isNavigator", options.isNavigator || false);
                this.model.set('instructionsText', this.getInstructions());
                this.model.set('hide', options.hide);
                this.model.set('hidePart', options.hidePart);

                if (this.model.get('points') > 1){
                    this.model.set('pts', 'pts.');
                } else {
                    this.model.set('pts', 'pt.');
                }

                if (this.isReview) {
                    this.model.set("isReview", this.isReview);
                    this.model.set("assessmentHeader", options.assessmentHeader);
                    this.model.set("totalQuestions", options.totalQuestions);
                    this.model.set('feedback', this.getFeedback());
                    this.model.set('isAnswerCorrect', QuestionUtils.isAnswerCorrect(this.model));

                    if (this.isPreviewMode){
                        this.model.set('isAnswerCorrect', true);
                    } else {
                        this.model.set('isAnswerCorrect', QuestionUtils.isAnswerCorrect(this.model));
                    }
                }

                if (this.isPreviewMode){
                    this.model.set("isPreviewMode", options.isPreviewMode);
                    if (CP30.appStateModel.get('assessmentInfo') && CP30.appStateModel.get('assessmentInfo').previewInfo){
                        this.model.set("isFeedbackHidden", CP30.appStateModel.get('assessmentInfo').previewInfo.hideAnswers);
                    }
                    this.listenTo(CP30.vent, Events.ASSESSMENT_PREVIEW_SHOW_ANSWERS, this.assessmentPreviewShowAnswers, this);
                    this.listenTo(CP30.vent, Events.ASSESSMENT_PREVIEW_HIDE_ANSWERS, this.assessmentPreviewHideAnswers, this);
                }

                if (options.isSubmitted !== undefined) {
                    this.model.set('isSubmitted', options.isSubmitted);
                }

                if (!this.cocktailInitialized) {
                    Cocktail.mixin(this, MathMLMixin);
                    this.cocktailInitialized = true;
                }
            },

            onRender: function() {

                if (this.isNavigator && !this.assessmentModel.get('hidePartsDisplay') &&
                        this.model.get('isFirstQuestionInPart')) {
                    this.navigatorPartContent.show(new AssessmentPartView({
                        model: this.assessmentModel.get('parts').get(this.model.get('partId')),
                        isNavigator: this.isNavigator,
                        hidePart: this.model.get('hidePart')
                    }));
                }

                if (this.questionType.value === QuestionType.CHOOSE_ONE.value) {
                    this.content.show(new McsrQuestionView({model: this.model}));
                } else if (this.questionType.value === QuestionType.CHOOSE_MULTIPLE.value) {
                    this.content.show(new McmrQuestionView({model: this.model}));
                } else if (this.questionType.value === QuestionType.FILL_IN_BLANK.value) {
                    this.content.show(new FibQuestionView({model: this.model}));
                } else if (this.questionType.value === QuestionType.MATCHING.value) {
                    this.content.show(new MatchingQuestionView({model: this.model}));
                } else if (this.questionType.value === QuestionType.TRUE_FALSE.value) {
                    this.content.show(new TrueFalseQuestionView({model: this.model}));
                }
            },

            onShow: function() {

                if (this.model.get('isSubmitted')) {
                    this.$(this.selectors.inputs).attr('disabled', true);
                }
            },

            getInstructions: function() {

                var instructions = _.findWhere(this.model.get('instructions'), {
                    deliveryTypeId: DeliveryType.ONLINE.assessmentDeliveryId,
                    audienceTypeId: AudienceType.STUDENT.id
                });

                if (instructions && instructions.text) {
                    return instructions.text;
                } else {
                    return null;
                }
            },

            getFeedback: function() {

                var feedback = _.findWhere(this.model.get('questionFeedbacks'), {
                    feedbackTypeId: this.feedbackType.id
                });
                return feedback;
            },

            assessmentPreviewShowAnswers: function() {
                this.$(this.selectors.feedback).removeClass('hide-feedback');
                this.$(this.selectors.questionContent).removeClass('hide-border');
            },

            assessmentPreviewHideAnswers: function() {
                this.$(this.selectors.feedback).addClass('hide-feedback');
                this.$(this.selectors.questionContent).addClass('hide-border');
            },

            getActualPoints: function() {

                var answers = _.findWhere(this.attemptModel.get('answers'), {
                    questionId: this.model.get('contentId')
                });
                return answers.actualPoints;
            }

        });
    }
);
