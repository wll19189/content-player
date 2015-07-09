// appRouter.js
// Main app router. Load sub-routes and handle error route.

define(
    [
        'marionette'
    ],
    function(Marionette) {

        return Marionette.AppRouter.extend({

            appRoutes: {

                '': 'index',
                'activity/:activityid(/)': 'loadActivity',
                'activity/:activityid/page/:pagenum(/)': 'loadActivity',
                'activityguide/:activityid(/)': 'loadActivityOutline',
                'activityguide/course/:courseid/unit/:unitid/lesson/:lessonid/:lotype/:loid(/)': 'loadStudentGuide',
                'activityguide/lesson/:lessonid/:lotype/:loid(/)': 'loadStudentGuideByLesson',
                'lesson/:lessonid(/)': 'loadLesson',
                'course/:courseid/unit/:unitid/lesson/:lessonid(/)': 'loadLessonWithCourseAndUnit',
                'course/:courseid/unit/:unitid/lesson/:lessonid/:lotype/:loid(/)': 'loadLearningObject',
                'course/:courseid/unit/:unitid/lesson/:lessonid/:lotype/:loid/page/:pagenum(/)': 'loadLearningObject',
                'lesson/:lessonid/:lotype/:loid(/)': 'loadLearningObjectByLesson',
                'lesson/:lessonid/:lotype/:loid/page/:pagenum(/)': 'loadLearningObjectByLesson',
                'course/:courseid/unit/:unitid/lesson/:lessonid/assessment/:assessmentid/question/:questionid(/)'
                    :'loadAssessmentQuestion',
                'lesson/:lessonid/assessment/:assessmentid/question/:questionid(/)'
                    :'loadAssessmentQuestionByLesson',
                'assessment/:assessmentid/question/:questionid(/)':'loadAssessmentQuestionByAssessment',
                'assessment/:assessmentid(/)':'loadAssessmentOpenerByAssessment',
                'course/:courseid/unit/:unitid/lesson/:lessonid/assessment/:assessmentid/opener(/)': 'loadAssessmentOpener',
                'course/:courseid/unit/:unitid/lesson/:lessonid/assessment/:assessmentid/closer(/)': 'loadAssessmentCloser',
                'lesson/:lessonid/assessment/:assessmentid/opener(/)': 'loadAssessmentOpenerByLesson',
                'lesson/:lessonid/assessment/:assessmentid/closer(/)': 'loadAssessmentCloserByLesson',
                'assessment/:assessmentid/opener(/)': 'loadAssessmentOpenerByAssessment',
                'assessment/:assessmentid/closer(/)': 'loadAssessmentCloserByAssessment',
                'confirmUrl/url/:url(/)': 'confirmUrl',
                'signout(/)': 'signout',
                'error/:errorId(/)': 'error',
                'epub/:epubId': 'loadEpub',
                'epub/:epubId/cfi/:cfi': 'loadEpub'

            },

            // appRoutes overrides SubRoutes and hijacks it.
            // So non-app-wide routes are defined in the Backbone standard way.
            routes: {

                '*splat': 'error'

            },

            initialize: function(options) {

                this.controller = options.controller;
                this.vent = options.controller.vent;

                console.log('AppRouter: initialized');
            },

            error: function(splat) {

                this.vent.trigger('error', splat);
            }
        });
    });
