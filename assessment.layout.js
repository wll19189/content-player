/*
 * Assessment.js
 *
 * Backbone View for Assessment.
 */
define(
    [
        'jquery',
        'underscore',
        'backbone',
        'marionette',
        'cocktail',
        'models/question.model',
        'views/question/question.layout',
        'models/answersheet.model',
        'models/answer.model',
        'views/assessment/opener/assessment.opener.layout',
        'views/assessment/closer/assessment.closer.layout',
        'views/assessment/footer/assessment.footer.view',
        'util/utils',
        'util/dateTimeUtils',
        'enums/conceptType',
        'enums/renderType',
        'enums/events',
        'enums/questionType',
        'util/constants',
        'views/question/navigator/navigator.layout',
        'conceptUtil/assessment.utils',
        'models/assessment.attempt.model',
        'models/assessment.model',
        'enums/permissionType',
        'util/permissions',
        'conceptUtil/question.utils',
        'views/tools/analytics',
        'enums/analytics/analyticsEventType',
        'mixins/analytics/analyticsAssessment'
    ],

    function ($, _, Backbone, Marionette, Cocktail, QuestionModel, QuestionLayout, AnswerSheet, Answer,
              AssessmentOpenerLayout, AssessmentCloserLayout, AssessmentFooterView, Utils, DateTimeUtils, ConceptType,
              RenderType, Events, QuestionType, Constants, QuestionNavigatorLayout, AssessmentUtils, AttemptModel,
              AssessmentModel, PermissionType, Permissions, QuestionUtils, Analytics, AnalyticsEventType,
              AnalyticsAssessmentMixin) {

        return Marionette.LayoutView.extend({

            template: 'assessment/assessment.layout',

            regions: {
                content: '#assessment-layout',
                footer: '#assessment-footer'
            },

            events: {
                'click .assessment-review': 'reviewAssessment',
                'click .assessment-exit-review': 'exitReview'
            },

            updateFooter: function() {
                var numberOfUnansweredQuestion = this.getNumberOfUnansweredQuestions(),
                    questionNumber = CP30.appStateModel.get('curQuestionSeqNum');

                if (this.isQuestionNavigator) {
                    if (numberOfUnansweredQuestion === 0){
                        this.showAssessmentFooter();
                    } else {
                        this.footer.reset();
                    }
                } else if (questionNumber === this.totalQuestions) {
                    this.showAssessmentFooter();
                }
            },



            initialize: function (options) {

                console.log("Initializing assessment layout");

                this.options = options;
                this.renderType = options.renderType;
                this.assessmentModel = this.model;
                this.isQuestionNavigator = false;
                this.assessmentId = CP30.appStateModel.get('curLO');
                this.allQuestions = this.model.get('allQuestions');
                this.totalQuestions = this.allQuestions.length;
                this.answerSheet = this.getAnswerSheet();

                this.isPreviewMode = Permissions.hasPermission(PermissionType.VIEW_ASSESSMENT);

                this.assessmentHeader = {
                    label: this.model.get('labelTypeName'),
                    title: this.model.get('displayName')
                };

                this.model.set("assessmentHeader", this.assessmentHeader);
                this.model.set("isPreviewMode", this.isPreviewMode);

                this.setQuestionDirectionalNav();

                if (!this.cocktailInitialized){
                    Cocktail.mixin(this, AnalyticsAssessmentMixin);
                    this.cocktailInitialized = true;
                }

                // The following code will run when the assessment is first shown, but not when refreshed.
                if (!this.listening) {
                    this.listenTo(CP30.vent, Events.ASSESSMENT_RENDER, this.refresh, this);
                    this.listenTo(CP30.vent, Events.ASSESSMENT_SUBMIT, this.submitAssessment, this);
                    this.listenTo(CP30.vent, Events.ASSESSMENT_SUBMIT_ERROR, this.assessmentSubmitError, this);
                    this.listenTo(CP30.vent, Events.ASSESSMENT_SHOW_REVIEW, this.loadAssessmentReview, this);
                    this.listenTo(CP30.vent, Events.ASSESSMENT_REVIEW_DONE, this.closeAttemptReview, this);
                    this.listenTo(CP30.vent, Events.ASSESSMENT_SHOW_PREVIEW, this.loadAssessmentPreview, this);

                    this.listenTo(CP30.vent, Events.QUESTION_ANSWERED, this.saveAnswer, this);
                    this.listenTo(CP30.vent, Events.QUESTION_NAVIGATOR_CLOSE, this.closeAssessmentFooter, this);
                    this.listenTo(CP30.vent, Events.QUESTION_NAVIGATOR_DONE, this.questionNavigatorDone, this);
                    this.listenTo(CP30.vent, Events.QUESTION_NAVIGATOR_SHOW, this.showQuestionNavigator, this);
                    this.listenTo(CP30.vent, Events.QUESTION_NAVIGATOR_SHOWN, this.questionNavigatorShown, this);

                    if (!this.isPreviewMode){
                        this.initAnalyticsListeners();
                    }

                    this.listening = true;
                }
            },

            onRender: function() {

                var question;

                if (this.renderType.value === RenderType.ASSESSMENT_OPENER.value) {

                    console.log("Rendering assessment opener");

                    CP30.vent.trigger(Events.NAVIGATION_SHOW);

                    this.showAssessmentOpener();

                    CP30.appStateModel.set('curQuestionSeqNum', undefined);

                    this.footer.reset();

                } else if (this.renderType.value === RenderType.ASSESSMENT_CLOSER.value) {

                    console.log("Rendering assessment closer");

                    CP30.vent.trigger(Events.NAVIGATION_HIDE, !Constants.nav.SHOW_DIRECTIONAL_ARROWS);

                    this.showAssessmentCloser();

                    CP30.appStateModel.set('curQuestionSeqNum', undefined);

                    this.footer.reset();

                } else if (this.renderType.value === RenderType.QUESTION.value) {


                    console.log("Rendering question, assessmentId=" + this.assessmentId + ", questionId=" + this.questionId);

                    CP30.vent.trigger(Events.NAVIGATION_HIDE, Constants.nav.SHOW_DIRECTIONAL_ARROWS);

                    question = this.allQuestions.get(Utils.parseInt(this.questionId));

                    this.showQuestion(question);

                    if (!this.model.get('isSubmitted') && Utils.parseInt(question.get('seqNum')) === this.totalQuestions) {
                        this.showAssessmentFooter();
                    } else {
                        this.footer.reset();
                    }
                }
                CP30.vent.trigger(Events.APP_CONTROLLER_RENDER_LO, ConceptType.ASSESSMENT.name);
            },

            onShow: function() {

                this.updateQuestionPartHeight();
            },

            // Render an assessment question or closer without reshowing the assessment layout.
            refresh: function(model, options) {

                this.initialize(_.extend({model: model}, options));
                this.onRender();
                this.updateQuestionPartHeight();
            },

            getAnswerSheet: function(answerS, setCorrectAnswer) {

                var answerSheet = answerS ? answerS : CP30.appStateModel.getAnswerSheet(this.assessmentId),
                    answer,
                    correctAnswer,
                    questionType;

                if (answerSheet.get('answers').length === 0) {

                    _.each(this.allQuestions.models, function(question) {

                        answer = new Answer();
                        correctAnswer = null;
                        questionType = QuestionType.getByType(question.get('typeName'));

                        answer.set({
                            contentId: question.get('contentId'),
                            contentVersion: question.get('contentVersion'),
                            documentId: question.get('documentId'),
                            seqNum: question.get('seqNum'),
                            partId: question.get('partId'),
                            questionPoints: question.get('points')
                        });

                        if (setCorrectAnswer){
                            correctAnswer = QuestionUtils.getCorrectAnswer(question);
                        }
                        QuestionUtils.setAnswer(questionType, answer, correctAnswer);

                        answerSheet.setAnswer(answer);
                    });
                }

                return answerSheet;
            },

            setQuestionDirectionalNav: function() {
                this.questionId = CP30.appStateModel.get('curQuestionID') || this.model.getQuestionIdAtPosition(0);
                this.questionId = parseInt(this.questionId, 10);

                CP30.appStateModel.set('curQuestionID', this.questionId);

                this.setPageList();
                this.setPagePosition();

                CP30.appStateModel.setDirectionalAssessmentNavState(this.assessmentId, this.questionId,
                    this.pageList, this.currentPage);
            },

            setPageList: function() {

                var self = this;

                this.pageList = [];

                _.each(this.allQuestions.models, function(question) {
                    self.pageList.push(question.get('contentId'));
                });

                this.pageList.push('closer');
            },

            setPagePosition: function() {

                var i, pageListId;

                this.currentPage = null;

                pageListId = this.renderType.value === RenderType.ASSESSMENT_OPENER.value ? 'opener'
                         :((this.renderType.value === RenderType.ASSESSMENT_CLOSER.value) ? 'closer' : this.questionId);

                for (i = 0; i < this.pageList.length; i++) {
                    if (this.pageList[i] === Utils.parseInt(pageListId)) {
                        this.currentPage = i;
                        break;
                    }
                }
            },

            showAssessmentOpener: function() {

                var openerLayout;

                this.isQuestionNavigator = false;
                openerLayout = new AssessmentOpenerLayout({
                    model: this.model,
                    assessmentHeader: this.assessmentHeader
                });

                this.content.show(openerLayout);

                CP30.vent.trigger(Events.NAVIGATION_RENDER);
            },

            showAssessmentCloser: function(isReviewed) {

                var closerLayout;

                this.isQuestionNavigator = false;
                $('#masterRegion').removeClass('question-navigator-shown');

                closerLayout = new AssessmentCloserLayout({
                    model: this.model,
                    showCloseButton: isReviewed
                });

                this.content.show(closerLayout);

                setTimeout(function() { CP30.vent.trigger(Events.ASSESSMENT_CLOSER_SHOWN); }, 0);
            },

            showQuestion: function(question) {

                var opts = {
                        model: question.clone(),
                        assessmentModel: this.model,
                        assessmentHeader : this.assessmentHeader,
                        totalQuestions : this.totalQuestions,
                        answer: this.answerSheet.getAnswer(this.questionId),
                        isSubmitted: this.model.get('isSubmitted')
                    },
                    curSeqNum = CP30.appStateModel.get('curQuestionSeqNum'),
                    curQuestionId = parseInt(CP30.appStateModel.get('curQuestionID'), 10),
                    navDirection;

                CP30.appStateModel.set('curQuestionSeqNum', question.get('seqNum'));

                if (curSeqNum && typeof(this.content.currentView.refresh) === 'function'){
                    if (curSeqNum && curQuestionId === question.get('contentId')){

                        if (question.get('seqNum') > parseInt(curSeqNum, 10)) {
                            navDirection = 'next';
                        } else if (question.get('seqNum') < parseInt(curSeqNum, 10)) {
                            navDirection = 'prev';
                        }
                        CP30.appStateModel.set('navDirection', navDirection);
                    }
                    this.content.currentView.refresh(opts);
                }else {
                    this.content.show(new QuestionLayout(opts));
                }
            },

            showAssessmentFooter: function() {
                this.footer.show(new AssessmentFooterView({
                    model: this.model,
                    numberOfUnansweredQuestions: this.getNumberOfUnansweredQuestions()
                }));
            },

            saveAnswer: function(questionId, seqNum, answer) {

                this.answerSheet.setAnswer(answer);

                var numberOfUnansweredQuestions = this.getNumberOfUnansweredQuestions();

                if (this.isQuestionNavigator) {
                    if (numberOfUnansweredQuestions === 0){
                        this.showAssessmentFooter();
                    } else {
                        this.footer.reset();
                    }
                } else if (seqNum === this.totalQuestions) {
                    this.showAssessmentFooter();
                }

            },

            submitAssessment: function() {

                var self = this,
                    answerSheet = this.answerSheet;

                // Close the footer, save the answer sheet and load the assessment closer when finished.
                if (!this.model.get('isSubmitted')) {
                    self.closeAssessmentFooter();
                    answerSheet.saveAnswerSheet(CP30.user.get('identityID'), this.model,
                        function() {

                            self.model.set('isSubmitted', true);

                            CP30.vent.trigger(Events.ANALYTICS_ASSESSMENT_TAKING,
                                    AnalyticsEventType.ON_ASSESSMENT_TAKING_SUBMIT_ASSESSMENT);

                            if (self.isQuestionNavigator) {
                                CP30.vent.trigger(Events.QUESTION_NAVIGATOR_CLOSE, null);
                            } else {
                                self.loadAssessmentCloser();
                            }
                        }
                    );
                }
            },

            loadAssessmentCloser:function() {
                CP30.router.navigate(AssessmentUtils.getAssessmentCloserRoute(), {trigger: true});
            },

            showAssessmentReview: function(attemptModel) {

                var assessmentModel = new AssessmentModel(attemptModel.get('assessment'), {parse: true}),
                    answerSheet,
                    attemptAnswers,
                    attemptAnswer,
                    answerModel,
                    questionType;

                $('#masterRegion').addClass("question-navigator-shown");

                this.footer.reset();

                this.isReview = true;

                assessmentModel.set("isReview", true);
                assessmentModel.set('isSubmitted', true);

                answerSheet = this.getAnswerSheet(new AnswerSheet({contentId: this.assessmentModel.get('contentId')}));
                attemptAnswers = attemptModel.get('answers');

                for (var i = 0; i < attemptAnswers.length; i++){
                    attemptAnswer = attemptAnswers[i];
                    answerModel = answerSheet.getAnswer(attemptAnswer.questionId);
                    questionType = this.model.getQuestionTypeById(attemptAnswer.questionId);
                    QuestionUtils.setAnswerFromAttempt(questionType, attemptAnswer, answerModel);
                    answerSheet.setAnswer(answerModel);
                }

                _.each(assessmentModel.get('allQuestions').models, function(question) {
                    question.set('answer', answerSheet.getAnswer(question.get('contentId')));
                });

                this.content.show(new QuestionNavigatorLayout({
                    model: assessmentModel,
                    filter: 'all',
                    isReview: true,
                    attemptModel: attemptModel
                }));

                this.isQuestionNavigator = true;

            },

            showQuestionNavigator: function(filter) {
                var self = this;

                $('#masterRegion').addClass("question-navigator-shown");

                this.footer.reset();

                this.isReview = false;

                // Assign the question answers from the answer sheet
                _.each(this.model.get('allQuestions').models, function(question) {
                    question.set('answer', self.answerSheet.getAnswer(question.get('contentId')));
                });

                this.content.show(new QuestionNavigatorLayout({
                    model: this.model,
                    filter: filter || 'all',
                    isReview: false
                }));

                this.isQuestionNavigator = true;
            },

            showAssessmentPreview: function() {
                var answerSheet;

                this.isReview = true;

                $('#masterRegion').addClass("question-navigator-shown");

                this.footer.reset();

                answerSheet = this.getAnswerSheet(new AnswerSheet({contentId: this.model.get('contentId')}), true);
                _.each(this.model.get('allQuestions').models, function(question) {
                    question.set('answer', answerSheet.getAnswer(question.get('contentId')));
                });

                this.content.show(new QuestionNavigatorLayout({
                    model: this.model,
                    isReview: this.isReview,
                    isPreviewMode: true
                }));

                this.isQuestionNavigator = true;
            },

            questionNavigatorDone: function(questionId) {

                var route;

                this.isQuestionNavigator = false;

                $('#masterRegion').removeClass('question-navigator-shown');

                if (questionId) {
                    CP30.appStateModel.get('questionNavigator').fadeInQuestion = true;

                    route = AssessmentUtils.getAssessmentQuestionRoute(questionId);

                    CP30.router.navigate(route);

                    if (CP30.appStateModel.get('isSingleLesson')) {
                        CP30.controller.loadAssessmentQuestionByLesson(CP30.appStateModel.get('curLesson'),
                            CP30.appStateModel.get('curLO'), questionId);
                    } else if (CP30.appStateModel.get('isSingleAssessment')) {
                        CP30.controller.loadAssessmentQuestionByAssessment(CP30.appStateModel.get('curLO'), questionId);
                    } else {
                        CP30.controller.loadAssessmentQuestion(CP30.appStateModel.get('curCourse'),
                            CP30.appStateModel.get('curUnit'), CP30.appStateModel.get('curLesson'),
                            CP30.appStateModel.get('curLO'), questionId);
                    }

                } else {
                    this.loadAssessmentCloser();
                }
            },

            questionNavigatorShown: function() {

                var numberOfUnansweredQuestions = this.getNumberOfUnansweredQuestions();

                if (numberOfUnansweredQuestions === 0 && !this.isReview && !this.model.get('isSubmitted')) {
                    this.showAssessmentFooter();
                }
            },

            getNumberOfUnansweredQuestions: function() {
                var self = this,
                    unansweredQuestions;

                unansweredQuestions = _.filter(this.allQuestions.models, function(question) {
                    var answer = self.answerSheet.getAnswer(question.get('contentId'));

                    if (!self.answerSheet.getAnswer(question.get('contentId'))) {
                        return false;
                    }

                    return !QuestionUtils.isQuestionAnswered(question, answer);

                });

                return unansweredQuestions.length;
            },

            closeAssessmentFooter: function() {

                this.footer.reset();
            },

            updateQuestionPartHeight: function() {

                if (this.renderType.value === RenderType.QUESTION.value) {
                    CP30.vent.trigger(Events.ASSESSMENT_UPDATE_PART_HEIGHT);
                }
            },

            closeAttemptReview: function() {

                var isReviewed = true;

                if (this.renderType.value === RenderType.ASSESSMENT_OPENER.value) {
                    this.showAssessmentOpener();
                    CP30.vent.trigger(Events.NAVIGATION_SHOW, Constants.nav.SHOW_DIRECTIONAL_ARROWS);
                } else if (this.renderType.value === RenderType.ASSESSMENT_CLOSER.value) {
                    this.showAssessmentCloser(isReviewed);
                }

            },

            loadAssessmentReview: function(attemptId) {
                var attemptModel = new AttemptModel({attemptId: attemptId}),
                    self = this;

                Utils.showLoading();

                attemptModel.fetch({
                    success: function(model) {
                        CP30.vent.trigger(Events.ANALYTICS_ASSESSMENT_REVIEW,
                               AnalyticsEventType.ON_ASSESSMENT_REVIEW_START, model);

                        Utils.hideLoading();
                        self.showAssessmentReview(model);
                    }
                });

            },

            loadAssessmentPreview: function() {
                this.showAssessmentPreview();
            },

            assessmentSubmitError: function() {
                this.showAssessmentFooter();
            }
        });
    }
);
