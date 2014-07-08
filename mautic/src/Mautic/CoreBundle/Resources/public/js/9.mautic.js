var MauticVars = {};
var mQuery = jQuery.noConflict(true);

//Fix for back/forward buttons not loading ajax content with History.pushState()
MauticVars.manualStateChange = true;
History.Adapter.bind(window, 'statechange', function () {
    if (MauticVars.manualStateChange == true) {
        //back/forward button pressed
        window.location.reload();
    }
    MauticVars.manualStateChange = true;
});

//live search vars
MauticVars.liveCache            = new Array();
MauticVars.lastSearchStr        = "";
MauticVars.globalLivecache      = new Array();
MauticVars.lastGlobalSearchStr  = "";

//register the loading bar for ajax page loads
MauticVars.showLoadingBar       = true;

mQuery.ajaxSetup({
    beforeSend: function () {
        if (MauticVars.showLoadingBar) {
            mQuery("body").addClass("loading-content");
        }
    },
    cache: false,
    xhr: function () {
        var xhr = new window.XMLHttpRequest();
        if (MauticVars.showLoadingBar) {
            xhr.upload.addEventListener("progress", function (evt) {
                if (evt.lengthComputable) {
                    var percentComplete = Math.round((evt.loaded / evt.total) * 100);
                    mQuery(".loading-bar .progress-bar").attr('aria-valuenow', percentComplete);
                    mQuery(".loading-bar .progress-bar").css('width', percentComplete + "%");
                }
            }, false);
            xhr.addEventListener("progress", function (evt) {
                if (evt.lengthComputable) {
                    var percentComplete = Math.round((evt.loaded / evt.total) * 100);
                    mQuery(".loading-bar .progress-bar").attr('aria-valuenow', percentComplete);
                    mQuery(".loading-bar .progress-bar").css('width', percentComplete + "%");
                }
            }, false);
        }
        return xhr;
    },
    complete: function () {
        if (MauticVars.showLoadingBar) {
            setTimeout(function () {
                mQuery("body").removeClass("loading-content");
                mQuery(".loading-bar .progress-bar").attr('aria-valuenow', 0);
                mQuery(".loading-bar .progress-bar").css('width', "0%");
            }, 500);
        } else {
            //change default back to show
            MauticVars.showLoadingBar = true;
        }
    }
});

var Mautic = {
    /**
     * Initiate various functions on page load, manual or ajax
     */
    onPageLoad: function (container, response) {
        container = typeof container !== 'undefined' ? container : 'body';

        //initiate links
        mQuery(container + " a[data-toggle='ajax']").on('click.ajax', function (event) {
            event.preventDefault();

            return Mautic.ajaxifyLink(this, event);
        });

        //initialize forms
        mQuery(container + " form[data-toggle='ajax']").each(function (index) {
            Mautic.ajaxifyForm(mQuery(this).attr('name'));
        });

        mQuery(container + " *[data-toggle='livesearch']").each(function (index) {
            Mautic.activateLiveSearch(mQuery(this), "lastSearchStr", "liveCache");
        });

        //initialize tooltips
        mQuery(container + " *[data-toggle='tooltip']").tooltip({html: true, container: 'body'});

        //initialize sortable lists
        mQuery(container + " *[data-toggle='sortablelist']").each(function (index) {
            var prefix = mQuery(this).attr('data-prefix');

            if (mQuery('#' + prefix + '_additem').length) {
                mQuery('#' + prefix + '_additem').click(function () {
                    var count = mQuery('#' + prefix + '_itemcount').val();
                    var prototype = mQuery('#' + prefix + '_additem').attr('data-prototype');
                    prototype = prototype.replace(/__name__/g, count);
                    mQuery(prototype).appendTo(mQuery('#' + prefix + '_list div.list-sortable'));
                    mQuery('#' + prefix + '_list_' + count).focus();
                    count++;
                    mQuery('#' + prefix + '_itemcount').val(count);
                    return false;
                });
            }

            mQuery('#' + prefix + '_list div.list-sortable').sortable({
                items: 'div.sortable',
                handle: 'span.postaddon',
                stop: function (i) {
                    var order = 0;
                    mQuery('#' + prefix + '_list div.list-sortable div.input-group input').each(function () {
                        var name = mQuery(this).attr('name');
                        name = name.replace(/\[list\]\[(.+)\]$/g, '') + '[list][' + order + ']';
                        mQuery(this).attr('name', name);
                        order++;
                    });
                }
            });
        });

        mQuery(container + " a[data-toggle='download']").on('click.download', function (event) {
            event.preventDefault();

            var link = mQuery(event.target).attr('href');

            //initialize download links
            var iframe = mQuery("<iframe/>").attr({
                src: link,
                style: "visibility:hidden;display:none"
            }).appendTo(mQuery('body'));
        });

        //little hack to move modal windows outside of positioned divs
        mQuery(container + " *[data-toggle='modal']").each(function (index) {
            var target = mQuery(this).attr('data-target');
            mQuery(target).on('show.bs.modal', function () {
                mQuery(target).appendTo("body");
            });
        });

        //initialize date/time
        mQuery(container + " *[data-toggle='datetime']").datetimepicker({
            format: 'Y-m-d H:i',
            lazyInit: true,
            validateOnBlur: false,
            allowBlank: true,
            scrollInput: false
        });

        mQuery(container + " *[data-toggle='date']").datetimepicker({
            timepicker: false,
            format: 'Y-m-d',
            lazyInit: true,
            validateOnBlur: false,
            allowBlank: true,
            scrollInput: false,
            closeOnDateSelect: true
        });

        mQuery(container + " *[data-toggle='time']").datetimepicker({
            datepicker: false,
            format: 'H:i',
            lazyInit: true,
            validateOnBlur: false,
            allowBlank: true,
            scrollInput: false
        });

        //Set the height of containers
        var windowWidth  = mQuery(window).width();
        if (windowWidth > 765) {
            var windowHeight = mQuery(window).height() - 175;
            mQuery(container + ' .auto-height').each(function (index) {
                //set height of divs
                mQuery(this).css('height', windowHeight + 'px');
            });
        }

        //Copy form buttons to the toolbar
        if (mQuery(container + " .bottom-form-buttons").length) {
            //hide the toolbar actions if applicable
            mQuery('.toolbar-action-buttons').addClass('hide');

            //hide the bottom buttons
            mQuery('.bottom-form-buttons').addClass('hide');
            var buttons = mQuery(container + " .bottom-form-buttons").html();
            mQuery(buttons).filter("button").each(function(i, v) {
                //get the ID
                var id = mQuery(this).attr('id');
                var button = mQuery("<button type='button' />")
                    .addClass(mQuery(this).attr('class'))
                    .html(mQuery(this).html())
                    .appendTo('.toolbar-form-buttons')
                    .click( function(event) {
                        event.preventDefault();
                        mQuery('#' + id).click();
                    });
            });
            mQuery('.toolbar-form-buttons').removeClass('hide');
        }

        //Activate hidden shelves
        mQuery(container + ' .hidden-shelf').each(function(index) {
            var shelf    = mQuery(this);
            var handle   = mQuery(this).find('.shelf-handle').first();
            var contents = mQuery(this).find('.shelf-contents').first();

            mQuery(handle).on('click.shelf', function(event) {
                if (mQuery(contents).css('display') == 'block') {
                    mQuery(handle).find('i').removeClass('fa-chevron-circle-up').addClass('fa-chevron-circle-down')
                    mQuery(contents).slideUp();
                } else {
                    mQuery(handle).find('i').removeClass('fa-chevron-circle-down').addClass('fa-chevron-circle-up')
                    mQuery(contents).slideDown();
                }
            });
        });

        //run specific on loads
        if (typeof Mautic[mauticContent + "OnLoad"] == 'function') {
            Mautic[mauticContent + "OnLoad"](container, response);
        }

        if (container == 'body') {
            //activate global live search
            var engine = new Bloodhound({
                datumTokenizer: Bloodhound.tokenizers.obj.whitespace('value'),
                queryTokenizer: Bloodhound.tokenizers.whitespace,
                prefetch: {
                    url: mauticAjaxUrl + "?action=globalCommandList"
                }
            });
            engine.initialize();

            mQuery('#global_search').typeahead({
                    hint: true,
                    highlight: true,
                    minLength: 0,
                    multiple: true
                },
                {
                    name: "global_search",
                    displayKey: 'value',
                    source: engine.ttAdapter()
                }
            ).on('typeahead:selected', function (event, datum) {
                //force live search update
                MauticVars.lastGlobalSearchStr = '';
                mQuery('#global_search').keyup();
            }).on('typeahead:autocompleted', function (event, datum) {
                //force live search update
                MauticVars.lastGlobalSearchStr = '';
                mQuery('#global_search').keyup();
            }).on('keypress', function (event) {
                if ((event.keyCode || event.which) == 13) {
                    mQuery('#global_search').typeahead('close');
                }
            });

            Mautic.activateLiveSearch("#global_search", "lastGlobalSearchStr", "globalLivecache");
        }
    },

    /**
     * Functions to be ran on ajax page unload
     */
    onPageUnload: function (container, response) {
        //unload tooltips so they don't double show
        container = typeof container !== 'undefined' ? container : 'body';

        mQuery(container + " *[data-toggle='tooltip']").tooltip('destroy');

        //unload tinymce editor so that it can be reloaded if needed with new ajax content
        mQuery(container + " textarea[data-toggle='editor']").each(function (index) {
            mQuery(this).tinymce().remove();
        });

        //run specific unloads
        if (typeof Mautic[mauticContent + "OnUnload"] == 'function') {
            Mautic[mauticContent + "OnUnload"](container, response);
        }
    },

    /**
     * Takes a given route, retrieves the HTML, and then updates the content
     * @param route
     * @param link
     * @param method
     * @param target
     * @param event
     */
    loadContent: function (route, link, method, target, event) {
        //keep browser backbutton from loading cached ajax response
        //var ajaxRoute = route + ((/\?/i.test(route)) ? "&ajax=1" : "?ajax=1");

        //little animation to let the user know that something is happening
        if (typeof event != 'undefined' && event.target) {
            Mautic.startIconSpinOnEvent(event);
        }

        mQuery.ajax({
            url: route,
            type: method,
            dataType: "json",
            success: function (response) {
                if (response) {
                    if (target || response.target) {
                        if (target) response.target = target;
                        Mautic.processPageContent(response);
                    } else {
                        //clear the live cache
                        MauticVars.liveCache = new Array();
                        MauticVars.lastSearchStr = '';

                        //set route and activeLink if the response didn't override
                        if (typeof response.route === 'undefined') {
                            response.route = route;
                        }

                        if (typeof response.activeLink === 'undefined' && link) {
                            response.activeLink = link;
                        }

                        if (mQuery(".page-wrapper").hasClass("right-active")) {
                            mQuery(".page-wrapper").removeClass("right-active");
                        }
                        Mautic.processPageContent(response);
                    }

                    //restore button class if applicable
                    Mautic.stopIconSpinPostEvent();
                }
            },
            error: function (request, textStatus, errorThrown) {
                alert(errorThrown);
            }
        });

        //prevent firing of href link
        //mQuery(link).attr("href", "javascript: void(0)");
        return false;
    },

    /**
     * Just a little visual that an action is taking place
     * @param event
     */
    startIconSpinOnEvent: function (event)
    {
        var hasBtn = mQuery(event.target).hasClass('btn');
        var hasIcon = mQuery(event.target).hasClass('fa');
        if ((hasBtn && mQuery(event.target).find('i.fa').length) || hasIcon) {
            MauticVars.iconButton = (hasIcon) ? event.target :  mQuery(event.target).find('i.fa').first();
            MauticVars.iconClassesRemoved = mQuery(MauticVars.iconButton).attr('class');
            var specialClasses = ['fa-fw', 'fa-lg', 'fa-2x', 'fa-3x', 'fa-4x', 'fa-5x', 'fa-li'];
            var appendClasses  = "";

            //check for special classes to add to spinner
            for (var i=0; i<specialClasses.length; i++) {
                if (mQuery(MauticVars.iconButton).hasClass(specialClasses[i])) {
                    appendClasses += " " + specialClasses[i];
                }
            }
            mQuery(MauticVars.iconButton).removeClass();
            mQuery(MauticVars.iconButton).addClass('fa fa-spinner fa-spin' + appendClasses);
        }
    },

    /**
     * Stops the icon spinning after an event is complete
     */
    stopIconSpinPostEvent: function()
    {
        if (typeof MauticVars.iconClassesRemoved != 'undefined') {
            if (mQuery(MauticVars.iconButton).hasClass('fa-spin')) {
                mQuery(MauticVars.iconButton).removeClass('fa fa-spinner fa-spin').addClass(MauticVars.iconClassesRemoved);
            }
            delete MauticVars.iconButton;
            delete MauticVars.iconClassesRemoved;
        }
    },

    /**
     * Opens or closes submenus in main navigation
     * @param link
     */
    toggleSubMenu: function (link, event) {
        if (mQuery(link).length) {
            //get the parent li element
            var parent = mQuery(link).parent();
            var child = mQuery(parent).find("ul").first();
            if (child.length) {
                var toggle = event.target;

                if (child.hasClass("subnav-closed")) {
                    //open the submenu
                    child.removeClass("subnav-closed").addClass("subnav-open");
                    mQuery(toggle).removeClass("fa-toggle-left").addClass("fa-toggle-down");
                } else if (child.hasClass("subnav-open")) {
                    //close the submenu
                    child.removeClass("subnav-open").addClass("subnav-closed");
                    mQuery(toggle).removeClass("fa-toggle-down").addClass("fa-toggle-left");
                }
            }
        }
    },

    /**
     * Posts a form and returns the output
     * @param form
     * @param callback
     */
    postForm: function (form, callback) {
        var action = form.attr('action');
       // var ajaxRoute = action + ((/\?/i.test(action)) ? "&ajax=1" : "?ajax=1");
        mQuery.ajax({
            type: form.attr('method'),
            url: action,
            data: form.serialize(),
            dataType: "json",
            success: function (data) {
                callback(data);
            },
            error: function (request, textStatus, errorThrown) {
                alert(errorThrown);
            }
        });
    },

    /**
     * Updates new content
     * @param response
     */
    processPageContent: function (response) {
        if (response) {
            if (!response.target) {
                response.target = '.main-panel-content';
            }

            //update type of content displayed
            if (response.mauticContent) {
                mauticContent = response.mauticContent;
            }

            //inactive tooltips, etc
            Mautic.onPageUnload(response.target, response);

            if (response.route) {
                //update URL in address bar
                MauticVars.manualStateChange = false;
                History.pushState(null, "Mautic", response.route);
            }

            //set content
            if (response.newContent) {
                if (response.replaceContent) {
                    mQuery(response.target).replaceWith(response.newContent);
                } else {
                    mQuery(response.target).html(response.newContent);
                }
            }

            //update breadcrumbs
            if (response.breadcrumbs) {
                mQuery(".main-panel-breadcrumbs").html(response.breadcrumbs);
            }

            //update latest flashes
            if (response.flashes) {
                mQuery(".main-panel-flash-msgs").html(response.flashes);

                //ajaxify links
                mQuery(".main-panel-flash-msgs a[data-toggle='ajax']").click(function (event) {
                    event.preventDefault();

                    return Mautic.ajaxifyLink(this, event);
                });
            }

            window.setTimeout(function() {
                mQuery(".main-panel-flash-msgs .alert").fadeTo(500, 0).slideUp(500, function(){
                    mQuery(this).remove();
                });
            }, 7000);

            if (response.activeLink) {
                //remove current classes from menu items
                mQuery(".side-panel-nav").find(".current").removeClass("current");

                //remove ancestor classes
                mQuery(".side-panel-nav").find(".current_ancestor").removeClass("current_ancestor");

                var link = response.activeLink;
                if (link !== undefined && link.charAt(0) != '#') {
                    link = "#" + link;
                }

                //add current class
                var parent = mQuery(link).parent();
                mQuery(parent).addClass("current");

                //add current_ancestor classes
                mQuery(parent).parentsUntil(".side-panel-nav", "li").addClass("current_ancestor");
            }

            //close sidebar if necessary
            if (mQuery(".left-side-bar-pin i").hasClass("unpinned") && !mQuery(".page-wrapper").hasClass("hide-left")) {
                mQuery(".page-wrapper").addClass("hide-left");
            }

            //scroll to the top
            if (response.target == '.main-panel-content') {
                mQuery('.main-panel-wrapper').animate({
                    scrollTop: 0
                }, 0);
            } else {
                var overflow = mQuery(response.target).css('overflow');
                var overflowY = mQuery(response.target).css('overflowY');
                if (overflow == 'auto' || overflow == 'scroll' || overflowY == 'auto' || overflowY == 'scroll') {
                    mQuery(response.target).animate({
                        scrollTop: 0
                    }, 0);
                }
            }

            //activate content specific stuff
            Mautic.onPageLoad(response.target, response);
        }
    },

    /**
     * Prepares form for ajax submission
     * @param form
     */
    ajaxifyForm: function (formName) {
        //prevent enter submitting form and instead jump to next line
        mQuery('form[name="' + formName + '"] input').keydown(function (e) {
            if (e.keyCode == 13) {
                var inputs = mQuery(this).parents("form").eq(0).find(":input");
                if (inputs[inputs.index(this) + 1] != null) {
                    inputs[inputs.index(this) + 1].focus();
                }
                e.preventDefault();
                return false;
            }
        });

        //activate the submit buttons so symfony knows which were clicked
        mQuery('form[name="' + formName + '"] :submit').each(function () {
            mQuery(this).click(function () {
                if (mQuery(this).attr('name')) {
                    mQuery('form[name="' + formName + '"]').append(
                        mQuery("<input type='hidden'>").attr({
                            name: mQuery(this).attr('name'),
                            value: mQuery(this).attr('value') })
                    );
                }

                //give an ajaxified form the option of not displaying the global loading bar
                var loading = mQuery(this).attr('data-hide-loadingbar');
                if (loading) {
                    MauticVars.showLoadingBar = false;
                }
            });
        });
        //activate the forms
        mQuery('form[name="' + formName + '"]').submit(function (e) {
            e.preventDefault();

            Mautic.postForm(mQuery(this), function (response) {
                Mautic.processPageContent(response);
            });

            return false;
        });
    },

    ajaxifyLink: function (el, event) {
        //prevent leaving if currently in a form
        if (mQuery(".prevent-nonsubmit-form-exit").length) {
            if (mQuery(el).attr('data-ignore-formexit') != 'true') {
                Mautic.showConfirmation(mQuery(".prevent-nonsubmit-form-exit").val());
                return false;
            }
        }

        var route = mQuery(el).attr('href');
        if (route.indexOf('javascript')>=0) {
            return false;
        }

        var link = mQuery(el).attr('data-menu-link');
        if (link !== undefined && link.charAt(0) != '#') {
            link = "#" + link;
        }

        var method = mQuery(el).attr('data-method');
        if (!method) {
            method = 'GET'
        }

        //give an ajaxified link the option of not displaying the global loading bar
        var loading = mQuery(el).attr('data-hide-loadingbar');
        if (loading) {
            MauticVars.showLoadingBar = false;
        }

        Mautic.loadContent(route, link, method, null, event);
    },

    /**
     * Show/hide side panels
     * @param position
     */
    toggleSidePanel: function (position) {
        //spring the right panel back into place after clicking elsewhere
        if (position == "right") {
            //toggle active state
            mQuery(".page-wrapper").toggleClass("right-active");
            //prevent firing event multiple times if directly toggling the panel
            mQuery(".main-panel-wrapper").off("click");
            mQuery(".main-panel-wrapper").click(function (e) {
                e.preventDefault();
                if (mQuery(".page-wrapper").hasClass("right-active")) {
                    mQuery(".page-wrapper").removeClass("right-active");
                }
                //prevent firing event multiple times
                mQuery(".main-panel-wrapper").off("click");
            });

            mQuery(".top-panel").off("click");
            mQuery(".top-panel").click(function (e) {
                if (!mQuery(e.target).parents('.panel-toggle').length) {
                    //dismiss the panel if clickng anywhere in the top panel except the toggle button
                    e.preventDefault();
                    if (mQuery(".page-wrapper").hasClass("right-active")) {
                        mQuery(".page-wrapper").removeClass("right-active");
                    }
                    //prevent firing event multiple times
                    mQuery(".top-panel").off("click");
                }
            });

        } else {
            //toggle hidden state
            mQuery(".page-wrapper").toggleClass("hide-left");
        }
    },

    /**
     * Stick a side panel
     * @param position
     */
    stickSidePanel: function (position) {
        var query = "action=togglePanel&panel=" + position;
        mQuery.ajax({
            url: mauticAjaxUrl,
            type: "POST",
            data: query,
            dataType: "json"
        });

        if (position == "left") {
            mQuery(".left-side-bar-pin i").toggleClass("unpinned");

            //auto collapse the left side panel
            if (mQuery(".left-side-bar-pin i").hasClass("unpinned")) {
                //prevent firing event multiple times if directly toggling the panel
                mQuery(".main-panel-wrapper").off("click");
                mQuery(".main-panel-wrapper").click(function (e) {
                    e.preventDefault();
                    if (!mQuery(".page-wrapper").hasClass("hide-left")) {
                        mQuery(".page-wrapper").addClass("hide-left");
                    }
                    //prevent firing event multiple times
                    mQuery(".main-panel-wrapper").off("click");
                });

                mQuery(".top-panel").off("click");
                mQuery(".top-panel").click(function (e) {
                    if (!mQuery(e.target).parents('.panel-toggle').length) {
                        //dismiss the panel if clickng anywhere in the top panel except the toggle button
                        e.preventDefault();
                        if (!mQuery(".page-wrapper").hasClass("hide-left")) {
                            mQuery(".page-wrapper").addClass("hide-left");
                        }
                        //prevent firing event multiple times
                        mQuery(".top-panel").off("click");
                    }
                });
            }
        }
    },

    /**
     * Display confirmation modal
     * @param msg
     * @param confirmText
     * @param confirmAction
     * @param confirmParams
     * @param cancelText
     * @param cancelAction
     * @param cancelParams
     */
    showConfirmation: function (msg, confirmText, confirmAction, confirmParams, cancelText, cancelAction, cancelParams) {
        if (cancelAction == '') {
            //default is to close the modal
            cancelAction = "dismissConfirmation";
        }

        if (typeof confirmText == 'undefined') {
            confirmText   = '<i class="fa fa-fw fa-2x fa-check"></i>';
            confirmAction = 'dismissConfirmation';
        }

        var confirmContainer = mQuery("<div />").attr({ "class": "confirmation-modal" });
        var confirmInnerDiv = mQuery("<div />").attr({ "class": "confirmation-inner-wrapper"});
        var confirmMsgSpan = mQuery("<span />").css("display", "block").html(msg);
        var confirmButton = mQuery('<button type="button" />')
            .addClass("btn btn-danger btn-xs")
            .css("marginRight", "5px")
            .css("marginLeft", "5px")
            .click(function () {
                if (typeof Mautic[confirmAction] === "function") {
                    window["Mautic"][confirmAction].apply('window', confirmParams);
                }
            })
            .html(confirmText);
        if (cancelText) {
            var cancelButton = mQuery('<button type="button" />')
                .addClass("btn btn-primary btn-xs")
                .click(function () {
                    if (typeof Mautic[cancelAction] === "function") {
                        window["Mautic"][cancelAction].apply('window', cancelParams);
                    }
                })
                .html(cancelText);
        }

        confirmInnerDiv.append(confirmMsgSpan);
        confirmInnerDiv.append(confirmButton);

        if (typeof cancelButton != 'undefined') {
            confirmInnerDiv.append(cancelButton);
        }

        confirmContainer.append(confirmInnerDiv);
        mQuery('body').append(confirmContainer)
    },

    /**
     * Dismiss confirmation modal
     */
    dismissConfirmation: function () {
        if (mQuery('.confirmation-modal').length) {
            mQuery('.confirmation-modal').remove();
        }
    },

    /**
     * Reorder table data
     * @param name
     * @param orderby
     */
    reorderTableData: function (name, orderby, tmpl, target) {
        var query = "action=setTableOrder&name=" + name + "&orderby=" + orderby;
        mQuery.ajax({
            url: mauticAjaxUrl,
            type: "POST",
            data: query,
            dataType: "json",
            success: function (response) {
                if (response.success) {
                    var route = window.location.pathname + "?tmpl=" + tmpl;
                    Mautic.loadContent(route, '', 'GET', target);
                }
            },
            error: function (request, textStatus, errorThrown) {
                alert(errorThrown);
            }
        });
    },

    /**
     *
     * @param name
     * @param filterby
     * @param filterValue
     * @param tmpl
     * @param target
     */
    filterTableData: function (name, filterby, filterValue, tmpl, target) {
        var query = "action=setTableFilter&name=" + name + "&filterby=" + filterby + "&value=" + filterValue;
        mQuery.ajax({
            url: mauticAjaxUrl,
            type: "POST",
            data: query,
            dataType: "json",
            success: function (response) {
                if (response.success) {
                    var route = window.location.pathname + "?tmpl=" + tmpl;
                    Mautic.loadContent(route, '', 'GET', target);
                }
            },
            error: function (request, textStatus, errorThrown) {
                alert(errorThrown);
            }
        });
    },

    limitTableData: function (name, limit, tmpl, target) {
        var query = "action=setTableLimit&name=" + name + "&limit=" + limit;
        mQuery.ajax({
            url: mauticAjaxUrl,
            type: "POST",
            data: query,
            dataType: "json",
            success: function (response) {
                if (response.success) {
                    var route = window.location.pathname + "?tmpl=" + tmpl;
                    Mautic.loadContent(route, '', 'GET', target);
                }
            },
            error: function (request, textStatus, errorThrown) {
                alert(errorThrown);
            }
        });
    },
    /**
     * Executes an object action
     * @param action
     */
    executeAction: function (action, menuLink) {
        //dismiss modal if activated
        Mautic.dismissConfirmation();
        mQuery.ajax({
            url: action,
            type: "POST",
            dataType: "json",
            success: function (response) {
                Mautic.processPageContent(response);
            },
            error: function (request, textStatus, errorThrown) {
                alert(errorThrown);
            }
        });
    },

    /**
     * Shows the search search input in an search list
     */
    showSearchInput: function () {
        if (mQuery('.toolbar').length) {
            mQuery('.toolbar').addClass('show-search').removeClass('hide-search');
        }
    },

    /**
     * Hides the search search input in an search list
     */
    hideSearchInput: function (elId) {
        if (mQuery('.toolbar').length && mQuery('#' + elId).length && !mQuery('#' + elId).val() && !mQuery('#' + elId).is(":focus")) {
            mQuery('.toolbar').addClass('hide-search').removeClass('show-search');
        }
    },

    /**
     * Activates Typeahead.js command lists for search boxes
     * @param elId
     * @param modelName
     */
    activateSearchAutocomplete: function (elId, modelName) {
        if (mQuery('#' + elId).length) {
            var livesearch = (mQuery('#' + elId).attr("data-toggle=['livesearch']")) ? true : false;

            var engine = new Bloodhound({
                datumTokenizer: Bloodhound.tokenizers.obj.whitespace('value'),
                queryTokenizer: Bloodhound.tokenizers.whitespace,
                prefetch: {
                    url: mauticAjaxUrl + "?action=commandList&model=" + modelName
                }
            });
            engine.initialize();

            mQuery('#' + elId).typeahead({
                    hint: true,
                    highlight: true,
                    minLength: 0,
                    multiple: true
                },
                {
                    name: elId,
                    displayKey: 'value',
                    source: engine.ttAdapter()
                }
            ).on('typeahead:selected', function (event, datum) {
                if (livesearch) {
                    //force live search update,
                    MauticVars.lastSearchStr = '';
                    mQuery('#' + elId).keyup();
                }
            }).on('typeahead:autocompleted', function (event, datum) {
                if (livesearch) {
                    //force live search update
                    MauticVars.lastSearchStr = '';
                    mQuery('#' + elId).keyup();
                }
            }).on('keypress', function (event) {
                if ((event.keyCode || event.which) == 13) {
                    mQuery('#' + elId).typeahead('close');
                }
            });
        }
    },

    activateLiveSearch: function(el, searchStrVar, liveCacheVar) {
        mQuery(el).on('keyup', {}, function (event) {
            var searchStr = mQuery(el).val().trim();
            var diff = searchStr.length - MauticVars[searchStrVar].length;
            var overlay = mQuery('<div />', {"class": "content-overlay"}).html(mQuery(el).attr('data-overlay-text'));
            if (mQuery(el).attr('data-overlay-background')) {
                overlay.css('background', mQuery(el).attr('data-overlay-background'));
            }
            if (mQuery(el).attr('data-overlay-color')) {
                overlay.css('color', mQuery(el).attr('data-overlay-color'));
            }
            var target = mQuery(el).attr('data-target');
            if (
                !MauticVars.searchIsActive &&
                (
                    searchStr in MauticVars[liveCacheVar] ||
                    diff >= 3 ||
                    event.which == 32 || event.keyCode == 32 ||
                    event.which == 13 || event.keyCode == 13
                )
            ) {
                MauticVars.searchIsActive = true;
                mQuery(target + ' .content-overlay').remove();
                MauticVars[searchStrVar] = searchStr;
                event.data.livesearch = true;
                Mautic.filterList(event, mQuery(el).attr('id'), mQuery(el).attr('data-action'), target, liveCacheVar);
            } else {
                if (!mQuery(target + ' .content-overlay').length) {
                    mQuery(target).prepend(overlay);
                }
            }
        });
        //find associated button
        var btn = "button[data-livesearch-parent='" + mQuery(el).attr('id') + "']";
        if (mQuery(btn).length) {
            if (mQuery(el).val()) {
                mQuery(btn).attr('data-livesearch-action', 'clear');
                mQuery(btn + ' i').removeClass('fa-search').addClass('fa-eraser');
            } else {
                mQuery(btn).attr('data-livesearch-action', 'search');
                mQuery(btn + ' i').removeClass('fa-eraser').addClass('fa-search');
            }
            mQuery(btn).on('click', {'parent': mQuery(el).attr('id')}, function (event) {
                Mautic.filterList(event,
                    event.data.parent,
                    mQuery('#' + event.data.parent).attr('data-action'),
                    mQuery('#' + event.data.parent).attr('data-target'),
                    'liveCache',
                    mQuery(this).attr('data-livesearch-action')
                );
            });
        }
    },

    /**
     * Filters list based on search contents
     */
    filterList: function (e, elId, route, target, liveCacheVar, action) {
        if (typeof liveCacheVar == 'undefined') {
            liveCacheVar = "liveCache";
        }

        var el = mQuery('#' + elId);
        //only submit if the element exists, its a livesearch, or on button click
        if (el.length && (e.data.livesearch || mQuery(e.target).prop("tagName") == 'BUTTON')) {
            var value = el.val().trim();
            //should the content be cleared?
            if (!value) {
                //force action since we have no content
                action = 'clear';
            } else if (action == 'clear') {
                el.val('');
                el.typeahead('val', '');
                value = '';
            }

            //update the buttons class and action
            var btn = "button[data-livesearch-parent='" + elId + "']";
            if (mQuery(btn).length) {
                if (action == 'clear') {
                    mQuery(btn).attr('data-livesearch-action', 'search');
                    mQuery(btn).children('i').first().removeClass('fa-eraser').addClass('fa-search');
                } else {
                    mQuery(btn).attr('data-livesearch-action', 'clear');
                    mQuery(btn).children('i').first().removeClass('fa-search').addClass('fa-eraser');
                }
            }

            //make the request
            if (value && value in MauticVars[liveCacheVar]) {
                var response = {"newContent": MauticVars[liveCacheVar][value]};
                response.target = target;
                Mautic.processPageContent(response);
                MauticVars.searchIsActive = false;
            } else {
                //disable page loading bar
                MauticVars.showLoadingBar = false;

                mQuery.ajax({
                    url: route,
                    type: "GET",
                    data: el.attr('name') + "=" + encodeURIComponent(value) + '&tmpl=content',
                    dataType: "json",
                    success: function (response) {
                        //cache the response
                        if (response.newContent) {
                            MauticVars[liveCacheVar][value] = response.newContent;
                        }
                        //note the target to be updated
                        response.target = target;
                        Mautic.processPageContent(response);

                        MauticVars.searchIsActive = false;
                    },
                    error: function (request, textStatus, errorThrown) {
                        alert(errorThrown);
                    }
                });
            }
        }
    },

    /**
     * Removes a list option from a list generated by ListType
     * @param el
     */
    removeFormListOption: function(el) {
        var sortableDiv = mQuery(el).parents('div.sortable');
        var inputCount  = mQuery(sortableDiv).parents('div.form-group').find('input.sortable-itemcount');
        var count = mQuery(inputCount).val();
        count--;
        mQuery(inputCount).val(count);
        mQuery(sortableDiv).remove();
    },

    /**
     * Toggles published status of an entity
     *
     * @param el
     * @param model
     * @param id
     */
    togglePublishStatus: function (event, el, model, id) {
        event.preventDefault();

        //destroy tooltips so it can be regenerated
        mQuery(el).tooltip('destroy');
        //clear the lookup cache
        MauticVars.liveCache      = new Array();
        MauticVars.showLoadingBar = false;

        //start icon spin
        Mautic.startIconSpinOnEvent(event);

        mQuery.ajax({
            url: mauticAjaxUrl,
            type: "POST",
            data: "action=togglePublishStatus&model=" + model + '&id=' + id,
            dataType: "json",
            success: function (response) {
                if (response.statusHtml) {
                    mQuery(el).replaceWith(response.statusHtml);
                    mQuery('.publish-icon'+id).tooltip({html: true, container: 'body'});
                }
            },
            error: function (request, textStatus, errorThrown) {
                alert(errorThrown);
            }
        });
    },

    /**
     * Adds active class to selected list item in left/right panel view
     * @param prefix
     * @param id
     */
    activateListItem: function(prefix,id) {
        mQuery('.bundle-list-item').removeClass('active');
        mQuery('#'+prefix+'-' + id).addClass('active');
    },

    /**
     * Expand right panel
     * @param el
     */
    expandPanel: function(el) {
        mQuery(el).toggleClass('fullpanel');
    },


    /**
     * Apply filter
     * @param list
     */
    setSearchFilter: function(el, searchId) {
        if (typeof searchId == 'undefined')
            searchId = '#list-search';
        else
            searchId = '#' + searchId;
        var filter  = mQuery(el).val();
        var current = mQuery('#list-search').typeahead('val');
        current    += " " + filter;

        //append the filter
        mQuery(searchId).typeahead('val', current);

        //submit search
        var e = mQuery.Event( "keypress", { which: 13 } );
        e.data = {};
        e.data.livesearch = true;
        Mautic.filterList(
            e,
            'list-search',
            mQuery(searchId).attr('data-action'),
            mQuery(searchId).attr('data-target'),
            'liveCache'
        );

        //clear filter
        mQuery(el).val('');
    }

};

//prevent page navigation if in the middle of a form
window.addEventListener("beforeunload", function (e) {
    if (mQuery(".prevent-nonsubmit-form-exit").length) {
        var msg = mQuery(".prevent-nonsubmit-form-exit").val();

        (e || window.event).returnValue = msg;     //Gecko + IE
        return msg;                                //Webkit, Safari, Chrome etc.
    }
});