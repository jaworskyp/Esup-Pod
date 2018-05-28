/*** table scroll ***/
// Change the selector if needed
$(window).on('load', function(){
    manageResize();
});
/*** end table scroll ***/
function manageResize() {
    var $table = $('table.scroll'),
    $bodyCells = $table.find('tbody tr:first').children(),
    colWidth;
    // Adjust the width of thead cells when window resizes
    $(window).resize(function() {
        // Get the tbody columns width array
        colWidth = $bodyCells.map(function() {
            return $(this).width();
        }).get();
        // Set the width of thead columns
        $table.find('thead tr').children().each(function(i, v) {
            $(v).width(colWidth[i]);
        });
    }).resize(); // Trigger resize handler
}

/*** Every button processing expects cancel
    On modify or new action, all buttons in the first page of enrichment
        are hidden and the form is displayed.
    On delete action, a request is sent with the enrich id.
    On save action, a request is sent with the form after a pair of
        validation functions are runned.
***/
$(document).on("submit", "#formcontent", function (e) {
    $(this).show();
    e.preventDefault();
    var jqxhr= '';
    var action = $(this).find('input[name=action]').val();
    if(action == "save"){
        $('form#form_new').hide();
        $('form.form_modif').hide();
        $('form.form_delete').hide();
        $(".form-help-inline").parents('div.form-group').removeClass("has-error");
        $(".form-help-inline").remove();
        verify_fields();
        if (!($("span").hasClass("form-help-inline"))){
            var msg = "";
            msg += verify_end_start_items();
            msg += overlaptest();
            if(msg != "") {
                show_messages(msg, 'danger');
            } else {
                var data_form = $( "form#form_enrich" ).serializeArray();
                jqxhr = $.post(
                    $( "form#form_enrich" ).attr("action"),
                    data_form
                );
                jqxhr.done(function(data){
                    if(data.list_enrich || data.form) {
                        if(data.errors){
                            get_form(data.form);
                        }else{
                            refresh_list_and_player(data);
                            $(window).scrollTop(360);
                            show_messages("{% trans 'Changes have been saved.' %}", 'info');
                        }
                    } else {
                        show_messages("{% trans 'You are no longer authenticated. Please log in again.' %}", 'danger', true);
                    }
                });
                jqxhr.fail(function($xhr) {
                    var data = $xhr.status+ " : " +$xhr.statusText;
                    show_messages("{% trans 'Error during recording.' %} " + "("+data+")<br/>"+"{% trans 'No data could be stored.' %}", 'danger');
                });
            }
        }else{
            show_messages("{% trans 'One or more errors have been found in the form.' %}", 'danger');
        }
    }
});

$(document).on("submit", "form#form_new", function (e) {
    e.preventDefault();
    var jqxhr= '';
    var action = $(this).find('input[name=action]').val();
    if (action == "new") {
        $('form#form_new').hide();
        $('form.form_modif').hide();
        $('form.form_delete').hide();
        manageResize();
        var elt = $(this).parents('tr');
        jqxhr = $.post( window.location.href, {"action":"new"} );
        jqxhr.done(function(data){
            if(data.indexOf("form_enrich")==-1) {
                show_messages("{% trans 'You are no longer authenticated. Please log in again.' %}", 'danger', true);
            } else {
                get_form(data);
                elt.addClass('info');
            }
        });
        jqxhr.fail(function($xhr) {
            var data = $xhr.status+ " : " +$xhr.statusText;
            show_messages("{% trans 'Error getting form.' %} " + "("+data+")"+ "{% trans 'The form could not be recovered.'%}", 'danger');
            $('form.form_modif').show();
            $('form.form_delete').show();
            $('form#form_new').show();
            $('#form_enrich').html("");
            manageResize();
        });
    }
});

$(document).on("submit", "form.form_modif", function (e) {
    e.preventDefault();
    var jqxhr= '';
    var action = $(this).find('input[name=action]').val();
    if(action == "modify") {
        $('form#form_new').hide();
        $('form.form_modif').hide();
        $('form.form_delete').hide();
        manageResize();
        var elt = $(this).parents('tr');
        var id = $(this).find('input[name=id]').val();
        jqxhr = $.post( window.location.href, {"action":"modify", "id": id });
        jqxhr.done(function(data){
            if(data.indexOf("form_enrich")==-1) {
                show_messages("{% trans 'You are no longer authenticated. Please log in again.' %}", 'danger', true);
            } else {
                get_form(data);
                elt.addClass('info');
            }
        });
        jqxhr.fail(function($xhr) {
            var data = $xhr.status+ " : " +$xhr.statusText;
            show_messages("{% trans 'Error getting form.' %} " + "("+data+")"+ "{% trans 'The form could not be recovered.'%}", 'danger');
            $('form.form_modif').show();
            $('form.form_delete').show();
            $('form#form_new').show();
            $('#form_enrich').html("");
            manageResize();
        });
    }
});

$(document).on("submit", "form.form_delete", function (e) {
    e.preventDefault();
    var jqxhr= '';
    var action = $(this).find('input[name=action]').val();
    if(action == "delete") {
        var deleteConfirm = confirm( "{% trans 'Are you sure you want to delete this enrichment?' %}");
        if (deleteConfirm){
            var id = $(this).find('input[name=id]').val();
            jqxhr = $.post( window.location.href, {"action":"delete", "id": id });
            jqxhr.done(function(data){
                if(data.list_enrich) {
                    refresh_list_and_player(data);
                } else {
                    show_messages("{% trans 'You are no longer authenticated. Please log in again.' %}", 'danger', true);
                }
            });
            jqxhr.fail(function($xhr) {
                var data = $xhr.status+ " : " +$xhr.statusText;
                show_messages("{% trans 'Error during deletion.' %} " + "("+data+")<br/>"+"{% trans 'No data could be deleted.' %}", 'danger');
            });
        }
    }
})
/*** Function show the item selected by type field ***/
$(document).on('change', '#page-video select#id_type', function() {
    enrich_type();
});
/*** refreshes the player with modification and show the list of enrich ***/
function refresh_list_and_player(data){
    delete videojs.players['player_video']
    $("#form_enrich").html("");
    $('form#form_new').show();
    $("span#enrich_player").html(data.player);
    $("span#list_enrich").html(data.list_enrich);
    manageResize();
    loadVideo();
};
/*** Display element of form enrich ***/
Number.prototype.toHHMMSS = function() {
    var seconds = Math.floor(this),
        hours = Math.floor(seconds / 3600);
    seconds -= hours*3600;
    var minutes = Math.floor(seconds / 60);
    seconds -= minutes*60;

    if (hours   < 10) {hours   = "0"+hours;}
    if (minutes < 10) {minutes = "0"+minutes;}
    if (seconds < 10) {seconds = "0"+seconds;}
    return hours+':'+minutes+':'+seconds;
};

function get_form(data) {
    $("#form_enrich").hide().html(data).fadeIn();
    $("input#id_start")
        .before("&nbsp;<span class='getfromvideo pull-right' style='margin-bottom:4px'><a id='getfromvideo_start' class='btn btn-info btn-sm'>{% trans 'Get time from the player'%}</a><span class='timecode'></span></span>");
    $("input#id_end")
        .before("&nbsp;<span class='getfromvideo pull-right' style='margin-bottom:4px'><a id='getfromvideo_end' class='btn btn-info btn-sm'>{% trans 'Get time from the player'%}</a><span class='timecode'></span></span>");
    enrich_type();
    manageResize();
};
function enrich_type(){
    $("#id_image").parents('div.form-group').hide();
    $("textarea#id_richtext").parents('div.form-group:first').hide();
    $("#id_weblink").parents('div.form-group').hide();
    $("#id_document").parents('div.form-group').hide();
    $("#id_embed").parents('div.form-group').hide();
    var val = $("select#id_type").val();
    if (val != '') {
        $("#form_enrich").find('[id^="id_' + val + '"]').parents('div.form-group:first').show();
    }
}
$(document).on('change','#page-video input#id_start',function() {
    $(this).parent().find("span.getfromvideo span.timecode").html(" "+parseInt($(this).val()).toHHMMSS());
});
$(document).on('change','#page-video input#id_end',function() {
    $(this).parent().find("span.getfromvideo span.timecode").html(" "+parseInt($(this).val()).toHHMMSS());
});
$(document).on('click','#page-video span.getfromvideo a',function(e) {
    e.preventDefault();
    if(!(typeof player === 'undefined')) {
        if($(this).context.id == "getfromvideo_start"){
            $("input#id_start").val(parseInt(player.currentTime()));
            $("input#id_start").trigger('change');
        } else {
            $("input#id_end").val(parseInt(player.currentTime()));
            $("input#id_end").trigger('change');
        }
    }
});
/*** Verify if value of field respect form field ***/
function verify_fields(){
    if ( document.getElementById("id_title").value == "" || document.getElementById("id_title").value.length < 2 || document.getElementById("id_title").value.length > 100 ) {
        $("input#id_title")
            .before("<span class='form-help-inline'>&nbsp;&nbsp;{% trans 'Please enter a title from 2 to 100 characters.' %} </span>")
            .parents('div.form-group').addClass('has-error');
    }
    if ( document.getElementById("id_start").value == "" || document.getElementById("id_start").value < 0 || document.getElementById("id_start").value >= video_duration ){
        $("input#id_start")
            .before("<span class='form-help-inline'>&nbsp; &nbsp;{% trans 'Please enter a correct start from 0 to ' %}" + (video_duration -1) + "</span>")
            .parents('div.form-group').addClass('has-error');
    }
    if ( document.getElementById("id_end").value == "" || document.getElementById("id_end").value <= 0 || document.getElementById("id_end").value > video_duration ){
        $("input#id_end")
            .before("<span class='form-help-inline'>&nbsp; &nbsp;{% trans 'Please enter a correct end from 1 to ' %} " + video_duration + "</span>")
            .parents('div.form-group').addClass('has-error');
    }
    switch (document.getElementById("id_type").value){
        case "image":
            if($("#id_image_thumbnail_img").attr('src') == "/static/filer/icons/nofile_48x48.png"){ //check with id_image value
                $("img#id_image_thumbnail_img")
                    .before("<span class='form-help-inline'>&nbsp; &nbsp;{% trans 'Please enter a correct image.' %} </span>")
                    .parents('div.form-group').addClass('has-error');
            }
            break;
        case "richtext":
            if(document.getElementById("id_richtext").value == ""){
                $("textarea#id_richtext")
                    .before("<span class='form-help-inline'>&nbsp; &nbsp;{% trans 'Please enter a correct richtext.' %} </span>")
                    .parents('div.form-group').addClass('has-error');
            }
            break;
        case "weblink":
            if(document.getElementById("id_weblink").value == ""){
                $("input#id_weblink")
                    .before("<span class='form-help-inline'>&nbsp; &nbsp;{% trans 'Please enter a correct weblink.' %} </span>")
                    .parents('div.form-group').addClass('has-error');
            } else {
                if(document.getElementById("id_weblink").value > 200){
                    $("input#id_weblink")
                    .before("<span class='form-help-inline'>&nbsp; &nbsp;{% trans 'Weblink must be less than 200 characters.' %} </span>")
                    .parents('div.form-group').addClass('has-error');
                }
            }
            break;
        case "document":
            if($("#id_document_thumbnail_img").attr('src') == "/static/filer/icons/nofile_48x48.png"){ //check with id_document value
                $("img#id_document_thumbnail_img")
                    .before("<span class='form-help-inline'>&nbsp; &nbsp;{% trans 'Please select a document.' %} </span>")
                    .parents('div.form-group').addClass('has-error');
            }
            break;
        case "embed":
            if(document.getElementById("id_embed").value == ""){
                $("textarea#id_embed")
                    .before("<span class='form-help-inline'>&nbsp; &nbsp;{% trans 'Please enter a correct embed.' %} </span>")
                    .parents('div.form-group').addClass('has-error');
            } else {
                if(document.getElementById("id_embed").value > 300){
                    $("input#id_weblink")
                    .before("<span class='form-help-inline'>&nbsp; &nbsp;{% trans 'Embed field must be less than 300 characters.' %} </span>")
                    .parents('div.form-group').addClass('has-error');
                }
            }
            break;
        default:
            $("select#id_type")
                .before("<span class='form-help-inline'>&nbsp; &nbsp;{% trans 'Please enter a type in index field.' %} </span>")
                .parents('div.form-group').addClass('has-error');
    }
};
/***  Verify if fields end and start are correct ***/
function verify_end_start_items(){
    var msg = "";
    new_start = parseInt(document.getElementById("id_start").value);
    new_end = parseInt(document.getElementById("id_end").value);
    if(new_start > new_end){
        msg = "{% trans 'The start field value is greater than the end field one.' %}";
    }else if(new_end > video_duration){
        msg = "{% trans 'The end field value is greater than the video duration.' %}";
    }else if (new_start == new_end){
        msg = "{% trans 'End field and start field cannot be equal.' %}";
    }
    return msg;
};
/*** Verify if there is a overlap with over enrich***/
function overlaptest(){
    //var video_list_enrich=[];
    var new_start = parseInt(document.getElementById("id_start").value);
    var new_end = parseInt(document.getElementById("id_end").value);
    var id = document.getElementById("id_enrich").value;
    var msg = "";
    $('ul#slides li').each(function() {
        var data_start = parseInt($(this).attr('data-start'));
        var data_end = parseInt($(this).attr('data-end'));
        if (id != $(this).attr('data-id') && !(new_start< data_start && new_end <= data_start || new_start >= data_end &&  new_end > data_end)){
            var text = "{% trans 'There is an overlap with the enrichment '%}" + '"' +$(this).attr('data-title')+'"' ;
            text += "{% trans ', please change start and/or end values.' %}.";
            msg+="<br/>"+ text ;
        }
    });
    return msg;
};

function changeDisplay(disp, duration) {
    duration = (typeof duration == 'undefined' ? 500 : duration);
    vid_width = parseInt(disp.split('/')[0]);
    slide_width = parseInt(disp.split('/')[1]);

    if (animation_complete === true) {
        animation_complete = false;
        if (vid_width == 100 && slide_width > 0) {
            $('video').css('zIndex', videozindex + 1);
            $('.vjs-slide').css('zIndex', videozindex + 2);

            $('.video-js .vjs-tech').animate(
                {
                    width: vid_width + '%',
                    height: '100%',
                    left: '0%'
                },
                duration
            );
            $('.video-js .vjs-slide').animate(
                {
                    width: slide_width + '%',
                    height: slide_width + '%',
                    left: (100 - slide_width) + '%'
                },
                duration,
                function() {
                    animation_complete = true;
                    if($('.vjs-slide article img').length) {
                        var top = parseInt(($('.vjs-slide article').height()-$('.vjs-slide article img').height())/2);
                        $('.vjs-slide article img').attr("style","top:"+top+"px;position:relative;");
                    }
                }
            );
        } else {
            if (slide_width == 100 && vid_width > 0) {
                $('video').css('zIndex', videozindex + 2);
                $('.vjs-slide').css('zIndex', videozindex + 1);
                $('.video-js .vjs-tech').animate(
                    {
                        width: vid_width + '%',
                        height: vid_width + '%',
                        left: '0%'
                    },
                    duration
                );
                $('.video-js .vjs-slide').animate(
                    {
                        width: slide_width + '%',
                        height: slide_height + '%',
                        left: (100 - slide_width) + '%'
                    },
                    duration,function() {
                        animation_complete = true;
                        if($('.vjs-slide article img').length) {
                            var top = parseInt(($('.vjs-slide article').height()-$('.vjs-slide article img').height())/2);
                            $('.vjs-slide article img').attr("style","top:"+top+"px;position:relative;");
                        }
                    }
                );
            } else {
                $('.video-js .vjs-tech').animate(
                    {
                        width: vid_width + '%',
                        height: '100%',
                        left: '0%'
                    },
                    duration
                );
                $('.video-js .vjs-slide').animate(
                    {
                        width: slide_width + '%',
                        height: slide_height + '%',
                        left: (100 - slide_width) + '%'
                    },
                    duration,
                    function() {
                        animation_complete = true;
                        if($('.vjs-slide article img').length) {
                            var top = parseInt(($('#player_video_html5_api').height()-$('.vjs-slide article img').height())/2);
                            $('.vjs-slide article img').attr("style","top:"+top+"px;position:relative;");
                        }
                    }
                );
            }
        }
        if (isPlaying) {
            myPlayer.play();
        } else {
            myPlayer.pause();
        }
    }
}