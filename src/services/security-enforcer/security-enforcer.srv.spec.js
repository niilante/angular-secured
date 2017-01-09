describe("securityEnforcer", function () {

  var securityEnforcer,
    securityEnforcerProvider,
    $state,
    $rootScope,
    $q,
    $log,
    $stateProvider,
    $httpBackend,
    $controllerProvider,
    permissionsDaoMock,
    localStorageServiceMock,
    defaultStateNames,
    cacheKeys,
    authAdapterMock,
    fakeToState,
    fakeToParams,
    fakeFromState,
    fakeFromParams,
    fakePagesConfig,
    DEFAULT_FULLPAGE_STATE_NAME,
    FAKE_TOSTATE_NAME,
    FAKE_FROMSTATE_NAME,
    FAKE_FULLPAGE_LOGIN_STATE_NAME,
    FAKE_POST_LOGIN_STATE_NAME,
    FAKE_POST_LOGOUT_STATE_NAME,
    FAKE_UNAUTHORIZED_STATE_NAME;

  beforeEach(module("ngSecured.services",
                    'mocks.ui.router',
                    'mocks.ngSecured.authAdapter',
                    'mocks.ngSecured.permissionsDao',
                    'mocks.localStorageService',
                    providersSetter));

  providersSetter.$inject = [
    'ngSecured.securityEnforcerProvider',
    '$stateProvider',
    '$controllerProvider'
  ];
  function providersSetter(_securityEnforcerProvider,
                           _$stateProvider,
                           _$controllerProvider) {
    securityEnforcerProvider = _securityEnforcerProvider;
    $stateProvider = _$stateProvider;
    $controllerProvider = _$controllerProvider;
  }


  beforeEach(inject([
    'ngSecured.securityEnforcer',
    '$state',
    '$q',
    '$log',
    '$rootScope',
    'ngSecured.defaultStateNames',
    'ngSecured.cacheKeys',
    '$httpBackend',
    '$http',
    'ngSecured.authAdapter',
    'localStorageService',
    'ngSecured.permissionsDao',
    function (_securityEnforcer,
              _$state,
              _$q,
              _$log,
              _$rootScope,
              _defaultStateNames,
              _cacheKeys,
              _$httpBackend,
              $http,
              authAdapter,
              _localStorageService,
              permissionsDao) {

      securityEnforcer = _securityEnforcer;
      $state = _$state;
      $q = _$q;
      $log = _$log;
      $rootScope = _$rootScope;
      defaultStateNames = _defaultStateNames;
      cacheKeys = _cacheKeys;
      $httpBackend = _$httpBackend;
      authAdapterMock = authAdapter;
      localStorageServiceMock = _localStorageService;
      permissionsDaoMock = permissionsDao;

    }]));


  beforeEach(function () {
    DEFAULT_FULLPAGE_STATE_NAME = defaultStateNames.LOGIN;
    FAKE_FULLPAGE_LOGIN_STATE_NAME = 'loginState';
    FAKE_TOSTATE_NAME = 'fakeState';
    FAKE_FROMSTATE_NAME = 'fakeFromState';
    FAKE_UNAUTHORIZED_STATE_NAME = 'fakeUnauthorizedState';
    FAKE_POST_LOGIN_STATE_NAME = 'fakePostLoginState';
    FAKE_POST_LOGOUT_STATE_NAME = 'fakePostLogoutState';

    fakeToState = {name: FAKE_TOSTATE_NAME};
    fakeFromState = {name: FAKE_FROMSTATE_NAME};

    fakePagesConfig = {};
    

  });

  When(function () {
    securityEnforcerProvider.setupPages(fakePagesConfig);
  });


  describe('METHOD: init', function () {
    Given(function () {
      $log.reset();
    });
    When(function () {
      securityEnforcer.init();
    });
    Then(function () {
      expect($log.error.logs.length).toBe(4);
    });
  });

  describe('METHOD: _handleStateChange', function () {
    var startEventMock;

    Given(function () {
      startEventMock = jasmine.createSpyObj('startEventMock', ['preventDefault']);
    });

    When(function () {
      securityEnforcer._handleStateChange(startEventMock,
                                   fakeToState,
                                   fakeToParams,
                                   fakeFromState,
                                   fakeFromParams);
    });

    describe('if state is not secured', function () {
      Then(function () {
        expect(startEventMock.preventDefault).not.toHaveBeenCalled();
      });
    });

    describe('if state is secured', function () {
      var _isPageApprovedDeferred;

      Given(function mockInnerFunctions() {
        securityEnforcer._goToLogin = jasmine.createSpy('_goToLogin');
        securityEnforcer.setLastDeniedStateAndParams = jasmine.createSpy('setLastDeniedStateAndParams');
        securityEnforcer._isPageApproved = jasmine.createSpy('securityEnforcer._isPageApproved');
        _isPageApprovedDeferred = $q.defer();
        securityEnforcer._isPageApproved.and.returnValue(_isPageApprovedDeferred.promise);
      });

      describe('if secured is boolean and true', function () {
        Given(function () {
          fakeToState.data = {secured: true};
        });

        describe('if user is logged in', function () {
          Given(function () {
            authAdapterMock.isLoggedIn.and.returnValue(true);
          });
          Then(function () {
            expect(startEventMock.preventDefault).not.toHaveBeenCalled();
          });
        });

        describe('if user is not logged in', function () {
          Given(function () {
            authAdapterMock.isLoggedIn.and.returnValue(false);
          });
          Then(function () {
            expect(startEventMock.preventDefault).toHaveBeenCalled();
            expect(securityEnforcer.setLastDeniedStateAndParams).toHaveBeenCalledWith(fakeToState, fakeToParams);
            expect(securityEnforcer._goToLogin).toHaveBeenCalled();
          });

        });
      });

      describe('if secured is string', function () {
        Given(function () {
          fakeToState.data = {secured: 'fakeSecurityPolicy.ctrl'};
          fakeToParams = {param: 'value'};
        });


        Then(function () {
          expect(startEventMock.preventDefault).toHaveBeenCalled();
          expect(securityEnforcer._isPageApproved).toHaveBeenCalledWith(fakeToState.data.secured, fakeToParams);
        });

        describe('if promise result is true', function () {
          When(function () {
            _isPageApprovedDeferred.resolve({answer: true});
            $rootScope.$apply();
          });

          Then(function () {
            expect($state.go).toHaveBeenCalledWith(fakeToState.name, fakeToParams);
          });
        });

        describe('if promise answer is false', function () {
          var response;
          Given(function () {
            response = {answer: false};
          });
          When(function () {
            _isPageApprovedDeferred.resolve(response);
            $rootScope.$apply();
          });

          describe('if user is not logged in', function () {
            Given(function () {
              authAdapterMock.isLoggedIn.and.returnValue(false);
            });
            Then(function () {
              expect(securityEnforcer.setLastDeniedStateAndParams).toHaveBeenCalledWith(fakeToState, fakeToParams);
              expect(securityEnforcer._goToLogin).toHaveBeenCalled();
            });
          });

          describe('when a requestApprovalState returns', function () {
            describe('when the value is string', function () {
              Given(function () {
                response.requestApprovalState = 'differentLogin';
              });
              Then(function () {
                expect($state.go).toHaveBeenCalledWith(response.requestApprovalState, undefined);
              });
            });

            describe('when the value is object should forward to the right state', function () {

              Given(function () {
                response.requestApprovalState = {
                  name: 'differentLogin',
                  params: {'key1': 'value1'}
                };
              });
              Then(function () {
                var requestApprovalState = response.requestApprovalState;
                expect($state.go).toHaveBeenCalledWith(requestApprovalState.name,
                                                       requestApprovalState.params);
              });


            });

          });

          describe('if user is logged in', function () {
            Given(function () {
              authAdapterMock.isLoggedIn.and.returnValue(true);
              fakePagesConfig.unAuthorized = FAKE_UNAUTHORIZED_STATE_NAME;
            });
            Then(function () {
              expect($state.go).toHaveBeenCalledWith(FAKE_UNAUTHORIZED_STATE_NAME);
            });
          });
        });

        describe('if promise rejected', function () {
          var errorResponse;
          Given(function(){
            errorResponse = 'Permissions is not set';
            $log.reset();
          });
          When(function(){
            _isPageApprovedDeferred.reject(errorResponse);
            $rootScope.$apply();
          });
          Then(function(){
            expect($log.error.logs.length).toBe(1);
          });
        });
      });

    });

  });

  describe('METHODS: setLastDeinedState, getLastDeniedState', function () {
    var lastDeniedState,
      lastDeniedStateParams,
      lastDeniedStateAndParams,
      returnedLastDeniedStateAndParams;
    Given(function () {
      lastDeniedState = {name: FAKE_TOSTATE_NAME};
      lastDeniedStateParams = fakeToParams;
      lastDeniedStateAndParams = {
        state: lastDeniedState,
        params: lastDeniedStateParams
      };
    });
    When(function () {
      securityEnforcer.setLastDeniedStateAndParams(lastDeniedState, lastDeniedStateParams);
      returnedLastDeniedStateAndParams = securityEnforcer.getLastDeniedStateAndParams();
    });
    Then(function () {
      expect(returnedLastDeniedStateAndParams).toEqual(lastDeniedStateAndParams);
      expect(localStorageServiceMock.set).toHaveBeenCalledWith(cacheKeys.LAST_STATE, lastDeniedStateAndParams);

    });
  });

  describe('METHOD: _goToLogin', function () {
    var passedFromStateName;

    When(function () {
      securityEnforcerProvider.setupPages(fakePagesConfig);

      securityEnforcer._goToLogin(passedFromStateName);
    });

    describe('if this is the first page after refresh', function () {
      Given(function () {
        passedFromStateName = '';
      });

      describe("if fullPageLoginStateName isn't defined", function () {
        Then(function () {
          expect($state.go).toHaveBeenCalledWith(DEFAULT_FULLPAGE_STATE_NAME);
        });
      });

      describe('if fullPageLoginStateName is defined', function () {
        Given(function () {
          fakePagesConfig.login = FAKE_FULLPAGE_LOGIN_STATE_NAME;
        });
        Then(function () {
          expect($state.go).toHaveBeenCalledWith(FAKE_FULLPAGE_LOGIN_STATE_NAME);
        });
      });

    });

  });

  describe('METHOD: _isPageApproved', function () {
    var securityControllerName,
      guardResponse,
      errorResponse,
      fakePermissions;

    Given(function () {
      fakePermissions = ['permission1', 'permission2'];
      permissionsDaoMock.$deferred.find.resolve(fakePermissions);
      securityControllerName = 'mySecurityController';
    });

    When(function () {
      securityEnforcer._isPageApproved(securityControllerName, fakeToParams)
        .then(
        function success(response) {
          guardResponse = response;
        },
        function error(error) {
          errorResponse = error;
        });
      $rootScope.$apply();
    });

    describe('should pass permissionsDao in context', function () {
      var passedPermissions;
      Given(function () {

        $controllerProvider.register(securityControllerName, ctrl);

        function ctrl(securityContext) {
          console.log('securityContext.permissionsFetcher', securityContext.permissionsFetcher);
          securityContext.permissionsDao
            .find()
            .then(function success(permissions){
                    passedPermissions = permissions;
                  });

        }
      });
      Then(function () {
        expect(passedPermissions).toEqual(fakePermissions);
      });
    });

    describe('should pass toParams in context', function () {
      var passedToParams;
      Given(function () {
        fakeToParams = {param: 'value'};

        $controllerProvider.register(securityControllerName, ctrl);
        function ctrl(securityContext) {
          passedToParams = securityContext.toParams;
        }
      });
      Then(function () {
        expect(passedToParams).toEqual(fakeToParams);
      });
    });

    describe('when guard allows', function () {
      Given(function () {
        $controllerProvider.register(securityControllerName, ctrl);
        function ctrl(securityContext) {
          securityContext.guard.allow();
        }
      });

      Then(function () {
        expect(guardResponse).toBeDefined();
        expect(guardResponse.answer).toBeTruthy();
      });
    });

    describe('when guard denies but supplies a different approval state', function () {
      var requestApprovalState;
      Given(function () {
        requestApprovalState = {name: 'differentState', params: {}};

        $controllerProvider.register(securityControllerName, ctrl);
        function ctrl(securityContext) {
          securityContext.guard.deny(requestApprovalState);
        }
      });
      Then(function () {
        expect(guardResponse).toBeDefined();
        expect(guardResponse.answer).toBeFalsy();
        expect(guardResponse.requestApprovalState).toBe(requestApprovalState);

      });
    });



  });

  describe('METHOD: goToPostLoginPage', function () {
    var fakeOptions;
    Given(function () {
      fakeOptions = {};
      
    });
    
    When(function () {
      securityEnforcer.goToPostLoginPage(fakeOptions);
    });

    describe('if custom post login passed', function () {
      Given(function(){
        fakeOptions.customPostLoginPage = 'app.customPostLogin';
      });

      Then(function(){
        expect($state.go).toHaveBeenCalledWith(fakeOptions.customPostLoginPage);
      });
      
    });

    describe('if doNotGoToPostLogin is true', function () {
      Given(function(){
        fakeOptions.doNotGoToPostLogin = true;
      });

      Then(function(){
        expect($state.go).not.toHaveBeenCalled();
      });
      
    });

    describe('when lastDeniedState is stored', function () {
      Given(function () {
        securityEnforcer.setLastDeniedStateAndParams(fakeToState, fakeToParams);
      });
      Then(function () {
        var lastState = securityEnforcer.getLastDeniedStateAndParams();
        expect(lastState).toBeUndefined();
        expect($state.go).toHaveBeenCalledWith(FAKE_TOSTATE_NAME, fakeToParams);
      });
    });

    describe('when lastDeniedState is not stored', function () {
      Given(function () {
        fakePagesConfig.postLogin = FAKE_POST_LOGIN_STATE_NAME;
      });
      Then(function () {
        expect($state.go).toHaveBeenCalledWith(FAKE_POST_LOGIN_STATE_NAME);
      });
    });

  });

  describe('METHOD: goToPostLogoutPage', function () {
    Given(function () {
      fakePagesConfig.postLogout = FAKE_POST_LOGOUT_STATE_NAME;
    });
    When(function () {
      securityEnforcer.goToPostLogoutPage();
    });

    describe('if page is secured, go to post logout', function () {
      Given(function () {
        $state.current = {
          data: {
            secured: true
          }
        }
        fakePagesConfig.postLogout = FAKE_POST_LOGOUT_STATE_NAME;
      });
      Then(function () {
        expect($state.go).toHaveBeenCalledWith(FAKE_POST_LOGOUT_STATE_NAME);
      });
    });

    describe('if page is not secured, stay in the same page', function () {
      Given(function () {
        $state.current = {}
      });
      Then(function () {
        expect($state.go).not.toHaveBeenCalled();
      });
    });

    describe('if page is login, go to post logout', function () {
      Given(function () {
        fakePagesConfig.login = FAKE_FULLPAGE_LOGIN_STATE_NAME;
        $state.current = {
          name: FAKE_FULLPAGE_LOGIN_STATE_NAME
        }
      });
      Then(function () {
        expect($state.go).toHaveBeenCalledWith(FAKE_POST_LOGOUT_STATE_NAME);
      });
    });
  });

})

// make further requests with the token in header
//$httpBackend.expectPOST(loginUrl, credentials, function(headers){
//  return headers['Authorization'] == 'test';
//})
