/**
 * appController.js
 *
 * Control, or mediate, app-wide routes, models, and views.
 */

define(
    [
        'backbone',
        'marionette',
        'views/master.layout',
        'views/landingPage',
        'views/unauthorized.view',
        'views/signin.view',
        'views/signout.view',
        'util/constants',
        'util/auth',
        'util/auth.error',
        'util/utils',
        'views/tools/analytics',
        'enums/conceptType',
        'enums/renderType'
    ],
    function (Backbone, Marionette, MasterLayoutView, IndexView, UnAuthView, SignInView,
              SignOutView, CONSTANTS, Auth, AuthError, Utils, Analytics, ConceptType, RenderType) {

        return Marionette.Controller.extend({

            initialize: function (options) {

                Analytics.init();

                this.user = options.user;
                this.appStateModel = CP30.appStateModel;
                this.vent = CP30.vent;

                this.listenTo(CP30.vent, 'error', this.error, this);
                this.listenTo(CP30.vent, 'unauthorized', this.unauthorized, this);
                this.listenTo(CP30.vent, 'show', this.show, this);
                this.listenTo(CP30.vent, 'app-controller:render-LO', this.onRenderLO, this);

                this.initializeMainLayout();

                console.log('AppController initialized');
            },

            initializeMainLayout: function() {

                var regionManager = new Marionette.RegionManager();

                regionManager.addRegion("masterRegion", "#masterRegion");

                this.masterRegion = regionManager.get('masterRegion');

                this.masterLayoutView = new MasterLayoutView();

                this.masterRegion.show(this.masterLayoutView);
            },

            index: function () {

                this.masterLayoutView.renderIndex();
            },

            signout: function() {

                this.masterLayoutView.signout();
            },

            error: function (splat, err) {

                this.masterLayoutView.renderError(splat, err);
            },

            unauthorized: function () {

                var loginURL = 'signin.html?next=' + encodeURIComponent(Backbone.history.fragment);
                window.location = loginURL;
            },

            isValidRoute: function() {

                var isValid = false;

                try {
                    Auth.authenticate();
                    isValid = true;
                } catch (err) {
                    console.log("receiving error on auth.authenticate");
                    if (err instanceof AuthError) {
                        this.unauthorized();
                    } else {
                        this.error(null, err);
                    }
                }

                return isValid;
            },

            loadLesson: function(lessonid) {

                console.log("appController: loadLesson");

                if (this.isValidRoute()) {

                    this.masterRegion.$el.removeClass("epub-shown");

                    this.masterLayoutView.renderLesson({
                        isSingleLesson: true,
                        lessonid: lessonid
                    });
                }
            },

            loadLessonWithCourseAndUnit: function(courseid, unitid, lessonid) {

                console.log("appController: loadLessonWithCourseAndUnit");

                if (this.isValidRoute()) {

                    this.masterRegion.$el.removeClass("epub-shown");

                    this.masterLayoutView.renderLesson({
                        isSingleLesson: false,
                        courseid: courseid,
                        unitid: unitid,
                        lessonid: lessonid
                    });
                }
            },

            loadAssessmentOpener: function(courseid, unitid, lessonid, assessmentid) {

                console.log("appController: loadAssessmentOpener");

                if (this.isValidRoute()) {

                    this.masterLayoutView.renderAssessmentOpener({
                        courseid: courseid,
                        unitid: unitid,
                        lessonid: lessonid,
                        assessmentid: assessmentid,
                        isSingleLesson: false
                    });
                }
            },

            loadAssessmentOpenerByLesson: function(lessonid, assessmentid) {

                console.log("appController: loadAssessmentOpenerByLesson");

                if (this.isValidRoute()) {

                    this.masterLayoutView.renderAssessmentOpener({
                        lessonid: lessonid,
                        assessmentid: assessmentid,
                        isSingleLesson: true,
                        isSingleAssessment: false
                    });
                }
            },

            loadAssessmentOpenerByAssessment: function(assessmentid) {

                console.log("appController: loadAssessmentOpenerByAssessment");
                
                if (this.isValidRoute()) {

                    this.masterLayoutView.renderAssessmentOpener({
                        assessmentid: assessmentid,
                        isSingleLesson: false,
                        isSingleAssessment: true
                    });
                }
            },

            loadAssessmentQuestion: function(courseid, unitid, lessonid, assessmentid, questionid) {

                console.log("appController: loadAssessmentQuestion");

                if (this.isValidRoute()) {

                    this.masterRegion.$el.removeClass("epub-shown");

                    this.masterLayoutView.renderAssessmentQuestion({
                        isSingleAssessment: false,
                        courseid: courseid,
                        unitid: unitid,
                        lessonid: lessonid,
                        assessmentid: assessmentid,
                        questionid: questionid
                    });
                }
            },

            loadAssessmentQuestionByLesson: function(lessonid, assessmentid, questionid) {

                console.log("appController: loadAssessmentQuestionByLesson");

                if (this.isValidRoute()) {

                    this.masterRegion.$el.removeClass("epub-shown");

                    this.masterLayoutView.renderAssessmentQuestion({
                        isSingleAssessment: false,
                        isSingleLesson: true,
                        lessonid: lessonid,
                        assessmentid: assessmentid,
                        questionid: questionid
                    });
                }
            },
            
            loadAssessmentQuestionByAssessment: function(assessmentid, questionid) {

                console.log("appController: loadAssessmentQuestionByAssessment");

                if (this.isValidRoute()) {

                    this.masterRegion.$el.removeClass("epub-shown");

                    this.masterLayoutView.renderAssessmentQuestion({
                        isSingleAssessment: true,
                        isSingleLesson: false,
                        assessmentid: assessmentid,
                        questionid: questionid
                    });
                }
            },

            loadAssessmentCloser: function(courseid, unitid, lessonid, assessmentid) {

                console.log("appController: loadAssessmentCloser");

                if (this.isValidRoute()) {

                    this.masterLayoutView.renderAssessmentCloser({
                        courseid: courseid,
                        unitid: unitid,
                        lessonid: lessonid,
                        assessmentid: assessmentid
                    });
                }
            },

            loadAssessmentCloserByLesson: function(lessonid, assessmentid) {

                console.log("appController: loadAssessmentCloserByLesson");

                if (this.isValidRoute()) {

                    this.masterLayoutView.renderAssessmentCloser({
                        isSingleLesson: true,
                        lessonid: lessonid,
                        assessmentid: assessmentid
                    });
                }
            },
            
            loadAssessmentCloserByAssessment: function(assessmentid) {

                console.log("appController: loadAssessmentCloserByAssessment");
                
                if (this.isValidRoute()) {

                    this.masterLayoutView.renderAssessmentCloser({
                        assessmentid: assessmentid,
                        isSingleLesson: false,
                        isSingleAssessment: true
                    });
                }
            },

            loadLearningObject: function(courseid, unitid, lessonid, lotype, loid, pagenum) {
                console.log("appController: loadLearningObject");

                if (this.isValidRoute()) {

                    this.masterRegion.$el.removeClass("epub-shown");

                    this.masterLayoutView.renderLearningObject({
                        courseid: courseid,
                        unitid: unitid,
                        lessonid: lessonid,
                        lotype: lotype,
                        loid: loid,
                        pagenum: pagenum,
                        isSingleLO: false
                    });
                }
            },

            loadLearningObjectByLesson: function(lessonid, lotype, loid, pagenum) {
                console.log("appController: loadLearningObjectByLesson");

                if (this.isValidRoute()) {

                    this.masterRegion.$el.removeClass("epub-shown");

                    this.masterLayoutView.renderLearningObject({
                        lessonid: lessonid,
                        lotype: lotype,
                        loid: loid,
                        pagenum: pagenum,
                        isSingleLO: false,
                        isSingleLesson: true
                    });
                }
            },

            loadActivity: function(activityid, pagenum) {

                console.log("appController: loadActivity");

                if (this.isValidRoute()) {

                    this.masterRegion.$el.removeClass("epub-shown");

                    this.masterLayoutView.renderLearningObject({
                        lotype: RenderType.ACTIVITY.value,
                        loid: activityid,
                        pagenum: pagenum || 1,
                        isSingleLO: true
                    });
                }
            },

            loadActivityOutline: function(activityId) {

                console.log("appController: loadActivityOutline");

                if (this.isValidRoute()) {

                    this.masterLayoutView.renderActivityGuide({
                        loid: activityId,
                        isSingleLO: true
                    });
                }
            },

            loadStudentGuide: function(courseid, unitid, lessonid, lotype, loid) {

                console.log("appController: loadStudentGuide");

                if (this.isValidRoute()) {

                    this.masterLayoutView.renderActivityGuide({
                        loid: loid,
                        lotype: lotype,
                        courseid: courseid,
                        unitid: unitid,
                        lessonid: lessonid,
                        isSingleLO: false,
                        isSingleLesson: false
                    });
                }
            },

            loadStudentGuideByLesson: function(lessonId, loType, loId) {

                console.log("appController: loadStudentGuideByLesson");

                if (this.isValidRoute()) {

                    this.masterLayoutView.renderActivityGuide({
                        lessonid: lessonId,
                        isSingleLO: false,
                        isSingleLesson: true,
                        lotype: loType,
                        loid: loId
                    });
                }
            },

            confirmUrl: function(url) {

                console.log("appController: confirmExternalUrl");

                this.masterLayoutView.renderConfirmUrl(Utils.safeDecodeURIComponent(url));
            },

            onRenderLO: function(evt) {

                console.log("appController: onRenderLO");

                this.masterRegion.$el.removeClass("epub-shown");
                this.masterRegion.$el.removeClass("question-navigator-shown");

                if (evt === ConceptType.ACTIVITY.name) {
                    this.masterRegion.$el.addClass("activity-shown");
                } else {
                    this.masterRegion.$el.removeClass("activity-shown");
                }

                if (evt === ConceptType.ASSESSMENT.name) {
                    this.masterRegion.$el.addClass("assessment-shown");
                } else {
                    this.masterRegion.$el.removeClass("assessment-shown");
                }

                if (CP30.appStateModel.get("isSingleLO")) {
                    this.masterRegion.$el.addClass("singleLO");
                } else {
                    this.masterRegion.$el.removeClass("singleLO");
                }
            },

            loadEpub: function(epubId, cfi) {

                console.log("appController: loadEpub");

                if (this.isValidRoute()) {

                    this.masterRegion.$el.addClass("epub-shown");
                    this.masterRegion.$el.removeClass("activity-shown");
                    this.masterRegion.$el.removeClass("assessment-shown");

                    this.masterLayoutView.renderEpub({
                        epubId: epubId,
                        cfi: cfi
                    });
                }
            }

        });

    }
);
