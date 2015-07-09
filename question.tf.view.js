/**
 * question.tf.view.js
 *
 * Item view for true/false question
 */

define([
    'underscore',
    'marionette',
    'handlebars',
    'conceptUtil/question.utils',
    'util/handlebars.helpers',
    'util/utils',
    'util/keyCode',
    'enums/events',
    'models/answer.model'
], function (_, Marionette, Handlebars, QuestionUtils, Helpers, Utils, KeyCode, Events, AnswerModel) {

    return Marionette.ItemView.extend({

        template: 'question/types/question.tf.view',

        events: {
            "click .list-group-item": "questionAnswered",
            "click .tf-choice-radio label": "onClickChoiceLabel"
        },

        ui: {
            feedback: '.tf-choice-feedback-wrapper',
            answerMark: '.tf-answer-mark',
            answer: '.tf-choice-answer-wrapper',
            choiceText: '.tf-choice-text'
        },

        selectors: {
            radioChecked: '.tf-choice-radio input:checked',
            choiceById: '.tf-choice-wrapper.choice-',
            answerByValue: '.answer-choice[value='
        },

        initialize: function() {

            this.model.set('touchClass', (Utils.isTouch() ? '' : 'no-touch'));

            this.isReview = this.model.get('isReview');
            this.isPreviewMode = this.model.get('isPreviewMode');

            if (this.isPreviewMode){
                if (CP30.appStateModel.get('assessmentInfo') && CP30.appStateModel.get('assessmentInfo').previewInfo){
                    this.isFeedbackHidden = CP30.appStateModel.get('assessmentInfo').previewInfo.hideAnswers;
                }
                this.listenTo(CP30.vent, Events.ASSESSMENT_PREVIEW_SHOW_ANSWERS, this.assessmentPreviewShowAnswers, this);
                this.listenTo(CP30.vent, Events.ASSESSMENT_PREVIEW_HIDE_ANSWERS, this.assessmentPreviewHideAnswers, this);
            }

            this.processChoices();

            Handlebars.registerPartial('textPrompt', Marionette.TemplateCache.get('common/textPrompt'));

            console.log("Initializing TF question");
        },

        onRender: function() {

            this.setAnswer();
            if (this.isFeedbackHidden){
                this.assessmentPreviewHideAnswers();
            }
        },

        setAnswer: function() {

            var self = this,
                answer = this.model.get('answer'),
                answerValue;

            if (answer && answer.get('selectedChoices')) {

                answerValue = answer.get('selectedChoices')[0] || '';

                _.each(this.model.get('choices'), function(choice) {
                    if (choice.choiceId === Utils.parseInt(answerValue)) {
                        self.$(self.selectors.answerByValue + answer.get('selectedChoices')[0] + ']').prop("checked", true);
                        self.$(self.selectors.choiceById + choice.choiceId).addClass("answered");
                    } else {
                        self.$(self.selectors.choiceById + choice.choiceId).removeClass("answered");
                    }
                });
            }
        },

        questionAnswered: function(event) {

            var self = this,
                $el = $(event.currentTarget),
                $radioInput = $el.find('input'),
                answer = new AnswerModel(),
                answerValue;

            event.stopPropagation();

            if (this.isReview) {
                return;
            }

            $radioInput.prop('checked', true);
            $radioInput.focus();

            answerValue = this.$(this.selectors.radioChecked).val();

            _.each(this.model.get('choices'), function(choice) {
                if (choice.choiceId === Utils.parseInt(answerValue)) {
                    this.$(self.selectors.choiceById + choice.choiceId).addClass("answered");
                } else {
                    this.$(self.selectors.choiceById + choice.choiceId).removeClass("answered");
                }
            });

            answer.set({
                contentId: this.model.get('contentId'),
                contentVersion: this.model.get('contentVersion'),
                documentId: this.model.get('documentId'),
                seqNum: this.model.get('seqNum'),
                partId: this.model.get('partId'),
                selectedChoices: answerValue ? [answerValue] : []
            });

            CP30.vent.trigger(Events.QUESTION_ANSWERED, this.model.get('contentId'), this.model.get("seqNum"), answer, this);
        },

        processChoices : function() {

            var self = this,
                isAnswerCorrect = QuestionUtils.isAnswerCorrect(this.model);

            _.each(this.model.get('choices'), function(choice) {

                var answer = self.model.get('answer'),
                    answerValue = answer && answer.get('selectedChoices') ? answer.get('selectedChoices')[0] : '',
                    correct = self.isReview && choice.isCorrect && choice.choiceId === Utils.parseInt(answerValue),
                    incorrect = self.isReview && !choice.isCorrect && choice.choiceId === Utils.parseInt(answerValue),
                    unanswered = self.isReview && !correct && !incorrect;

                choice.nameGroup = 'choice-tf-' + self.model.get('contentId');
                choice.showPreviewCorrect = self.isPreviewMode && choice.isCorrect;
                choice.showCorrectArrow = self.isReview && !self.isPreviewMode && choice.isCorrect && !isAnswerCorrect;
                choice.isAnswerCorrect = isAnswerCorrect;
                choice.isChoiceCorrect = correct;
                choice.isChoiceIncorrect = incorrect;
                choice.isUnanswered = !correct && !incorrect;
                choice.answerClass = correct ? 'correct' : (incorrect ? 'incorrect': (unanswered ? 'unanswered': ''));
                choice.hideAnswerClass = correct && self.isFeedbackHidden ? 'hide-choice-feedback' : '';
                choice.feedbackText = (correct || incorrect) ? choice.choiceFeedbackText : '';
            });
        },

        assessmentPreviewShowAnswers: function() {
            this.ui.feedback.removeClass('preview-hide');
            this.ui.answer.removeClass('preview-hide');
            this.ui.answerMark.removeClass('preview-hide');
            this.ui.choiceText.removeClass('preview-answers-off');
        },

        assessmentPreviewHideAnswers: function() {
            this.ui.feedback.addClass('preview-hide');
            this.ui.answer.addClass('preview-hide');
            this.ui.answerMark.addClass('preview-hide');
            this.ui.choiceText.addClass('preview-answers-off');
        },

        onClickChoiceLabel: function(event) {
            event.preventDefault();
        }
    });
});


