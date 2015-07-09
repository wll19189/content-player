/**
 * question.fib.view.js
 *
 * Item view for Fill in the Blank Question
 */

define([
    'underscore',
    'backbone',
    'marionette',
    'util/constants',
    'enums/questionType',
    'enums/textInputType',
    'util/handlebars.helpers',
    'util/utils',
    'conceptUtil/question.utils',
    'util/keyCode',
    'enums/events'
], function (_, Backbone, Marionette, Constants, QuestionType, TextInputType, Helpers, Utils, QuestionUtils, KeyCode,
             Events) {

    return Marionette.ItemView.extend({

        template: "question/types/question.fib.view",

        events: {
            "focusout input[type='text']": "questionAnswered",
            'keyup .question-type-fib': 'questionAnswered'
        },

        ui: {
            fillInTheBlankSpans : ".k12_assessment_item_inline_answer",
            validationBadge: '.fib-validation-badge',
            validationPointer: '.validation-pointer'
        },

        selectors: {
            fillInTheBlankInputs: ".question-blank-input",
            fibFeedbackWrapper: '.fib-feedback-wrapper'
        },

        initialize: function() {

            this.isPreviewMode = this.model.get('isPreviewMode');
            this.isReview = this.model.get('isReview');

            if (this.isPreviewMode){
                if (CP30.appStateModel.get('assessmentInfo') && CP30.appStateModel.get('assessmentInfo').previewInfo){
                    this.isFeedbackHidden = CP30.appStateModel.get('assessmentInfo').previewInfo.hideAnswers;
                }
                this.listenTo(CP30.vent, Events.ASSESSMENT_PREVIEW_SHOW_ANSWERS, this.assessmentPreviewShowAnswers, this);
                this.listenTo(CP30.vent, Events.ASSESSMENT_PREVIEW_HIDE_ANSWERS, this.assessmentPreviewHideAnswers, this);
            }

            if (this.isReview) {
                this.processBlanks();
            }
        },

        onRender: function() {

            this.changeCalmsFibSpansToHtmlInputs();

            if (this.isFeedbackHidden){
                this.assessmentPreviewHideAnswers();
            }
        },

        changeCalmsFibSpansToHtmlInputs: function() {
            var blanks = this.model.get('blanks'),
                blank,
                answer,
                blankAnswers,
                self = this;


            this.ui.fillInTheBlankSpans.each(function(index, el) {
                blank = blanks[index];

                var correctOrIncorrectText = "",
                    className = "question-blank-input",
                    image = "",
                    inputValue,
                    isInputDisabled,
                    replacementString;

                if (self.isPreviewMode) {
                    correctOrIncorrectText = "correct";
                } else if (self.isReview) {
                    answer = self.model.get('answer');
                    if (answer) {
                        blankAnswers = answer.get('blankAnswers');
                        correctOrIncorrectText = QuestionUtils.isFibBlankCorrect(blank.blankId, blankAnswers) ?
                            "correct" : "incorrect";
                    }
                }

                className += " " + correctOrIncorrectText;

                if (correctOrIncorrectText !== "") {
                    image = "<img class='cp-input-" + correctOrIncorrectText + "-icon' src='images/icons/" +
                        correctOrIncorrectText + "-white.png' alt='Incorrect Icon'>";
                }

                inputValue = self.isPreviewMode ?
                    self.getFirstAcceptableAnswer(blank) : self.getAnswerForFibInput(blank.blankId);



                isInputDisabled = (self.isPreviewMode || self.isReview) ? "disabled='true'" : "";

                replacementString = "<span class='cp-fib-block'><input id='cp-blank-" + blank.blankId +
                    "' data-blankid='" + blank.blankId + "' class='" + className + "' type='text' " +
                    "size='" + blank.length + "' maxlength='" + blank.maxChars + "' " +
                    isInputDisabled  + " value='" + inputValue + "' data-valuestore='" +
                    inputValue + "' autocomplete='false'" + " data-validation='" + blank.textInputTypeName +
                    "'</input>" + image +
                    "</span>";

                $(el).replaceWith(replacementString);


            });
        },

        getFirstAcceptableAnswer: function(blank) {
            return blank.acceptableAnswers[0].response;
        },

        getAnswerForFibInput: function(blankId) {

            var answer = this.model.get('answer'),
                blankAnswers = (answer && answer.get('blankAnswers')) ? answer.get('blankAnswers') : undefined,
                retVal = "";

            if (blankAnswers) {
                if (this.isReview) {
                    if (blankAnswers[blankId] && blankAnswers[blankId].response) {
                        retVal = blankAnswers[blankId].response;
                    }
                } else {
                    if (blankAnswers[blankId]) {
                        retVal = blankAnswers[blankId];
                    }
                }
            }
            return retVal;
        },



        setAnswer: function() {
            var answer = this.model.get('answer');
            if (answer && answer.get('answer')) {
                var answerValue = answer.get('answer');
                // Get all of the blanks
                var inputs = $(this.selectors.fillInTheBlankInputs);

                inputs.each(function(index) {
                    inputs[index].value = answerValue[index];
                });
            }
        },

        questionAnswered: function(event) {
            var answer = this.model.get('answer'),
                blankAnswers,
                inputBlankValue = event.target.value,
                inputBlankId = event.target.getAttribute('data-blankId').trim(),
                inputDataValidationType = event.target.getAttribute('data-validation'),
                isValid;

            blankAnswers = answer.get('blankAnswers') ? answer.get('blankAnswers') : {};

            isValid = this.validateInput(inputBlankValue, inputDataValidationType);

            if (isValid) {

                this.showValidationBadge(false);

                blankAnswers[inputBlankId] = inputBlankValue.trim();

                answer.set({
                    contentId: this.model.get('contentId'),
                    contentVersion: this.model.get('contentVersion'),
                    documentId: this.model.get('documentId'),
                    seqNum: this.model.get('seqNum'),
                    partId: this.model.get('partId'),
                    blankAnswers: blankAnswers
                });

                CP30.vent.trigger(Events.QUESTION_ANSWERED, this.model.get('contentId'), this.model.get("seqNum"),
                                  answer, this);
            } else {

                // Clear the input
                event.target.value = "";

                // -- Prepare the validation badge. --
                var validationBadge = $('.fib-validation-badge'),
                    validationBadgeText = $('.validation-text'),
                    halfWidth = ($(event.target).width()) / 2;

                validationBadge.insertBefore($(event.target));
                validationBadge.css('left', -75 + halfWidth + "px");

                // Determine Appropriate Text for Validation Badge.
                if (inputDataValidationType === TextInputType.TEXT_ONLY.value) {
                    validationBadgeText.text(TextInputType.TEXT_ONLY.message);
                } else if (inputDataValidationType === TextInputType.NUMBERS_ONLY.value) {
                    validationBadgeText.text(TextInputType.NUMBERS_ONLY.message);
                }

                // Show the Badge.
                this.showValidationBadge(true);


            }
        },

        showValidationBadge: function(isShow) {

            if (isShow) {
                this.ui.validationBadge.show();
                this.ui.validationPointer.show();
            } else {
                this.ui.validationBadge.hide();
                this.ui.validationPointer.hide();
            }
        },

        validateInput: function(textInput, textInputType) {

            var regEx,
                isValid = true;

            // An empty string is valid.
            if (textInput === "") {
                return true;
            }

            if (textInputType === TextInputType.TEXT_ONLY.value) {
                regEx = /^[a-zA-Z]+$/;
                if (!textInput.match(regEx)) {
                    isValid = false;
                }
            } else if (textInputType === TextInputType.NUMBERS_ONLY.value) {
                regEx = /^[0-9]+$/;
                if (!textInput.match(regEx)) {
                    isValid = false;
                }
            }

            return isValid;
        },

        processBlanks : function() {
            var self = this,
                blankAnswers = self.model.get('answer') ? self.model.get('answer').get('blankAnswers') : null,
                isQuestionCorrect = self.isPreviewMode ? true : QuestionUtils.isAnswerCorrect(this.model),
                isChoiceLevelFeedbackExist = false,
                isDisplayQuestionFeedback = false;

            _.each(this.model.get('blanks'), function(blank) {

                if (blank.choiceFeedbackText) {
                    isChoiceLevelFeedbackExist = true;
                }

                if (self.isPreviewMode) {
                    blank.isCorrect = true;
                } else if (blankAnswers && blankAnswers[blank.blankId]) {
                    blank.isCorrect = blankAnswers[blank.blankId].correct ? true : false;
                }

                if (self.isPreviewMode) {
                    blank.response = blank.acceptableAnswers[0].response;
                } else {
                    if (blankAnswers && blankAnswers[blank.blankId]) {
                        blank.response =  blankAnswers[blank.blankId].response
                                          ? blankAnswers[blank.blankId].response
                                          : undefined;
                    }
                }

                if (self.isPreviewMode || self.isReview) {
                    if (!blank.isCorrect) {
                        blank.isDisplayAnswer = true;
                    } else if (blank.choiceFeedbackText) {
                        blank.isDisplayAnswer = true;
                    }
                } else {
                    blank.isDisplayAnswer = false;
                }

                blank.firstAcceptableAnswer = blank.acceptableAnswers ? blank.acceptableAnswers[0].response : "";

            });

            if (this.isPreviewMode || this.isReview) {
                if (isQuestionCorrect && isChoiceLevelFeedbackExist) {
                    isDisplayQuestionFeedback = true;
                } else if (!isQuestionCorrect) {
                    isDisplayQuestionFeedback = true;
                }
            }

            this.model.set('isDisplayQuestionFeedback', isDisplayQuestionFeedback);
        },

        assessmentPreviewShowAnswers: function() {

            $(this.selectors.fibFeedbackWrapper).show();

            _.each($(this.selectors.fillInTheBlankInputs), function(inputBlank) {
                inputBlank.value = inputBlank.getAttribute('data-valuestore');
            });

            $(this.selectors.fillInTheBlankInputs).addClass('correct');
            $(".cp-input-correct-icon").removeClass('preview-hide');
        },

        assessmentPreviewHideAnswers: function() {
            $(this.selectors.fibFeedbackWrapper).hide();

            _.each($(this.selectors.fillInTheBlankInputs), function(inputBlank) {
                inputBlank.value = '';
            });

            $(this.selectors.fillInTheBlankInputs).removeClass('correct');

            $(".cp-input-correct-icon").addClass('preview-hide');

        }

    });
});

