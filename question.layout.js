/**
 * question.layout.js
 *
 * Layout for question content
 */

define([
    'underscore',
    'backbone',
    'marionette',
    'conf/configurations',
    'util/utils',
    'models/question.model',
    'views/question/question.header.view',
    'views/question/navigator/preview.header.view',
    'views/question/question.content.layout',
    'views/assessment/assessment.part.view',
    'enums/events',
    'enums/questionType',
    'conceptUtil/question.utils',
    'enums/analytics/analyticsEventType'

], function (_, Backbone, Marionette, Config, Utils, QuestionModel, QuestionHeaderView,
             QuestionHeaderPreview, QuestionContentLayout, AssessmentPartView, Events,
             QuestionType, QuestionUtils, AnalyticsEventType) {

        return Marionette.LayoutView.extend({

            template: 'question/question.layout',

            regions: {
                header: '#cp-page-header',
                content1: '.cp-question-content-1',
                content2: '.cp-question-content-2',
                partHeader: '#cp-part-header'
            },

            selectors: {
                partContent: '#cp-part-header .part-content',
                partHeader: '#cp-part-header .part-header',
                carouselWrap: '#cp-question-page-content',
                carouselContent1: '#cp-question-page-content .page-carousel-item.content-1.active',
                questionContent: '.question-content',
                gradingMessage: '.grading-message-wrapper',
                questionHeader: '.question-header'
            },

            initialize: function(options) {

                console.log("Initializing question layout");

                this.pageTransitionComplete = false;
                this.navDirection = CP30.appStateModel.get('navDirection');
                // Determine which carousel content area to use by determining which one is active
                this.useCarouselContent1 = this.$(this.selectors.carouselContent1).length > 0 ? false : true;
                this.model.set("useContent1", this.navDirection === 'first' || this.useCarouselContent1);

                _.bindAll(this, 'updatePartHeight', 'onPageSlideComplete');

                this.options = options;
                this.assessmentModel = options.assessmentModel;

                this.isPreviewMode = this.assessmentModel.get('isPreviewMode');
                this.questionType = QuestionType.getByType(this.model.get('typeName'));

                this.model.set("isPreviewMode", this.isPreviewMode);
                this.model.set("isReview", options.isReview);
                this.model.set('isSubmitted', options.isSubmitted);
                this.model.set("assessmentHeader", options.assessmentHeader);
                this.model.set("answer", options.answer);
                this.model.set("totalQuestions", options.totalQuestions);
                this.model.set('hidePartsDisplay', this.assessmentModel.get('hidePartsDisplay'));

                // The following code will run when the question is first shown, but not when refreshed.
                if (!this.listening) {
                    if (!this.assessmentModel.get('hidePartsDisplay')) {
                        $(window).on('resize', this.updatePartHeight);
                        $(window).on('orientationchange', this.updatePartHeight);
                    }
                    this.listenTo(CP30.vent, Events.ASSESSMENT_SUBMIT, this.displayGradingMessage, this);
                    this.listenTo(CP30.vent, Events.ASSESSMENT_SUBMIT_ERROR, this.removeGradingMessage, this);
                    this.listenTo(CP30.vent, Events.ASSESSMENT_UPDATE_PART_HEIGHT, this.updatePartHeight, this);
                    this.listening = true;
                }
            },

            onRender: function() {
                var correctAnswerId;

                if (CP30.appStateModel.get('questionNavigator').fadeInQuestion) {
                    this.$('.question-header, .question-container').addClass('not-in');
                }

                if (this.isPreviewMode){

                    correctAnswerId = QuestionUtils.getCorrectAnswer(this.model);

                    this.model.get("answer").set('answer', correctAnswerId);

                    this.header.show(new QuestionHeaderPreview({
                            model: this.model,
                            isSingleQuestionView: true
                        }));
                }else {
                    this.header.show(new QuestionHeaderView({model: this.model}));
                }

                this.initializeCarousel();

                if (!this.assessmentModel.get('hidePartsDisplay')) {
                    this.partHeader.show(new AssessmentPartView({
                        model: this.assessmentModel.get('parts').get(this.model.get('partId')),
                        isNavigator: false
                    }));
                }

            },

            onShow: function() {

                var self = this,
                    firstItem;

                if (this.navDirection !== 'first') {
                    this.carousel.carousel(this.navDirection);
                }

                if (CP30.appStateModel.get('questionNavigator').fadeInQuestion) {
                    CP30.appStateModel.get('questionNavigator').fadeInQuestion = false;
                    setTimeout(function() {
                        self.$('.question-header, .question-container').addClass('fade-in').removeClass('not-in');
                    }, 0);
                }else {
                    CP30.vent.trigger(Events.ANALYTICS_ASSESSMENT_TAKING,
                            AnalyticsEventType.ON_ASSESSMENT_TAKING_ENTER_QUESTION,
                            {questionId: this.model.get('contentId')});
                }

                if (this.navDirection === 'first') {
                    Utils.updateLiveMessage(this.getPageAnnounceMessage());
                }

                if (this.questionType.value === QuestionType.MATCHING.value) {
                    firstItem = this.model.get('items')[0];
                    if (!Utils.isTouch()) {
                        setTimeout(function() {this.$('.item-select-' + firstItem.itemId).focus();}, 0);
                    }
                }
            },

            onDestroy: function() {

                this.$(this.selectors.carouselWrap).off('slid.bs.carousel');

                if (!this.assessmentModel.get('hidePartsDisplay')) {
                    $(window).off('resize', this.updatePartHeight);
                    $(window).off('orientationchange', this.updatePartHeight);
                }
            },

            refresh: function(options) {

                CP30.vent.trigger(Events.ANALYTICS_ASSESSMENT_TAKING,
                        AnalyticsEventType.ON_ASSESSMENT_TAKING_LEAVE_QUESTION, {question: this.model});

                this.model.set(options.model.toJSON());
                this.initialize(options);

                this.$(this.selectors.carouselWrap).off('slid.bs.carousel');

                this.onRender();
                this.onShow();
            },

            initializeCarousel: function() {
                var view;

                this.carousel = this.$(this.selectors.carouselWrap).carousel({interval: false});

                this.$(this.selectors.carouselWrap).on('slid.bs.carousel', this.onPageSlideComplete);

                if (this.isPreviewMode){
                    view = new QuestionContentLayout({
                        model: this.model,
                        assessmentModel: this.assessmentModel,
                        isReview: true,
                        isPreviewMode: true
                    });
                }else {
                    view = new QuestionContentLayout({
                        model: this.model,
                        assessmentModel: this.assessmentModel
                    });
                }

                if (this.navDirection === 'first') {
                    this.content1.show(view);
                } else if (this.useCarouselContent1) {
                    $('body').addClass('horizontal-scroll-off');
                    this.content1.show(view);
                    this.resetRegion = this.content2;
                } else {
                    $('body').addClass('horizontal-scroll-off');
                    this.content2.show(view);
                    this.resetRegion = this.content1;
                }
            },

            onPageSlideComplete: function() {

                $('body').removeClass('horizontal-scroll-off');

                this.pageTransitionComplete = true;

                // Reset the region that just transitioned out
                if (this.resetRegion) {
                    this.resetRegion.reset();
                }

                Utils.updateLiveMessage(this.getPageAnnounceMessage());
            },

            displayGradingMessage: function() {

                this.$(this.selectors.questionContent).addClass('hide');
                this.$(this.selectors.gradingMessage).removeClass('hide');
                this.$(this.selectors.questionHeader).addClass('fade-out');
            },

            removeGradingMessage: function() {

                this.$(this.selectors.questionContent).removeClass('hide');
                this.$(this.selectors.gradingMessage).addClass('hide');
                this.$(this.selectors.questionHeader).removeClass('fade-out');
            },

            updatePartHeight: function() {

                var partHeight = $(this.selectors.partContent).outerHeight();
                $(this.selectors.partHeader).height(partHeight);
            },

            getPageAnnounceMessage: function() {

                return 'Question ' + this.model.get('seqNum') + ' of ' +
                        this.assessmentModel.get('totalQuestions');
            }
        });
    }
);
