<t4 type="content" name="Program Title" output="fulltext" use-element="true" filename-element="Program Title" modifiers="striptags,htmlentities" />
// PSL
var version = "23.0";
eval(function (version) {
  var minImports = JavaImporter(
    com.terminalfour.media.IMediaManager,
    com.terminalfour.spring.ApplicationContextProvider,
    com.terminalfour.version.Version);
  with (minImports) {
    var mm = ApplicationContextProvider.getBean(IMediaManager),
      media = mm.get(3101315, language, new Version(version)).getMedia(),
      s = new java.util.Scanner(media).useDelimiter("\\A");
    return String(s.hasNext() ? s.next() : "")
  }
}(version))

String.prototype.wrap = function (tags) {
  if (!Array.isArray(tags)) {
    tags = [tags]
  }
  return tags.map(val => {
    return val.attributes ? ('<' + val.tag + ' ' + val.attributes + '>') : ('<' + val + '>')
  }).join('') +
    this.toString() +
    tags.reverse().map(val => {
      return '</' + (val.attributes ? val.tag : val) + '>'
    }).join('')
}



var idStr = content.get('Web Image ID number').getValue()

function imgStr(id) {
  return getValueFromT4Tag('<t4 type="media" id="' + idStr + '" output="normal" formatter="v10/image/pxl-crop" cdn="true"  pxl-filter-id="' + id + '" />').content
}

var youtubeRegex = /^((?:https?:)?\/\/)?((?:www|m)\.)?((?:youtube(-nocookie)?\.com|youtu.be))(\/(?:[\w\-]+\?v=|embed\/|v\/)?)([\w\-]+)(\S+)?$/
var templateHTMLMulti = '<div class="dropdownWrap"><button class="dropbtn " id="dropdownMenuButton">NAME</button><div class="dropdown-content">TARGET</div></div>' //loc-btn

var mapInfo = get('Map', (points) => {
  points = '' + points.publish()
  return points.split('|').map(point => point.trim().split(',').map(_point => parseFloat(_point)))
})

if (mapInfo) {
  var script = 'function initialize(){const map=new google.maps.Map(document.getElementById("map"),{center:{lat:LATREPLACE,lng:LNGREPLACE},streetViewControl:0,mapTypeControl:0,fullscreenControl:0,zoom:4});NEWBOUNDS;MARKERREPLACE;FITBOUNDS}window.addEventListener("load",initialize);'
  var center = GetCenterFromDegrees(mapInfo)
  script = script.replace('LATREPLACE', center[0]).replace('LNGREPLACE', center[1]).replace('MARKERREPLACE', function () {
    var str = ''
    for (var i = 0; i < mapInfo.length; i++) {
      str += 'var position ={lat:LATREPLACE,lng:LNGREPLACE};new google.maps.Marker({position,map});BOUNDSEXTEND;'.replace('LATREPLACE', mapInfo[i][0]).replace('LNGREPLACE', mapInfo[i][1]).replace('BOUNDSEXTEND;', function () {
        return mapInfo.length > 1 ? 'bounds.extend(position);' : ''
      })
    }
    return str
  }()).replace('NEWBOUNDS;', function () {
    return mapInfo.length > 1 ? 'var bounds=new google.maps.LatLngBounds();' : ''
  }()).replace('FITBOUNDS', function () {
    return mapInfo.length > 1 ? 'map.fitBounds(bounds)' : ''
  }())

  document.write('<script async src="https://maps.googleapis.com/maps/api/js?key=AIzaSyDhlCYucnhMSvBEBeyOBJDLYwXipTn690w"></script>')
  document.write('<script async>' + script + '</script>')

}


// function openCity(evt, cityName) {
//   // Declare all variables
//   var i, tabcontent, tablinks;

//   // Get all elements with class="tabcontent" and hide them
//   tabcontent = document.getElementsByClassName("tabcontent");
//   for (i = 0; i < tabcontent.length; i++) {
//     tabcontent[i].style.display = "none";
//   }

//   // Get all elements with class="tablinks" and remove the class "active"
//   tablinks = document.getElementsByClassName("tablinks");
//   for (i = 0; i < tablinks.length; i++) {
//     tablinks[i].className = tablinks[i].className.replace(" active", "");
//   }

//   // Show the current tab, and add an "active" class to the button that opened the tab
//   document.getElementById(cityName).style.display = "block";
//   evt.currentTarget.className += " active";
// }

document.write('<script> function openCity(evt, cityName) {var i, tabcontent, tablinks;tabcontent = document.getElementsByClassName("tabcontent"); for (i = 0; i < tabcontent.length; i++) {tabcontent[i].style.display = "none";} tablinks = document.getElementsByClassName("tablinks");for (i = 0; i < tablinks.length; i++) {tablinks[i].className = tablinks[i].className.replace("active", "");tablinks[i].setAttribute("aria-selected", "false");}' +
  'document.getElementById(cityName).style.display = "block";evt.currentTarget.className += " active";evt.currentTarget.setAttribute("aria-selected", "true");} </script>'
)

// document.write('<script defer>document.addEventListener("DOMContentLoaded", function() {' +
//   'const accordions = document.querySelectorAll(".flat-base-accordion");' + // Select all accordion elements
//   'accordions.forEach(function(accordion) {' + // Iterate through each accordion
//       'const button = accordion.querySelector(".accordion__button");' +
//       'const content = accordion.querySelector(".accordion__content");' +
//       'button.addEventListener("click", function() {' +
//           'const isExpanded = button.getAttribute("aria-expanded") === "true";' +
//           'button.setAttribute("aria-expanded", !isExpanded);' +
//           'if (isExpanded) {' +
//               'content.style.maxHeight = "0";' +
//          ' content.style.display = "none";'+
//               'content.style.padding = "0 18px";'+
//               'content.classList.add("open--accordion");'+
//           '} else {' +
//               'content.style.display = "block";' +
//               'content.style.padding = "18px";'+
//               'content.style.maxHeight = "fit-content";' +
//               'content.classList.add("close--accordion");'+
//           '}' +
//       '});' +
//   '});' +
// '});<\/script>');

document.write('<script defer>document.addEventListener("DOMContentLoaded", function() {'+
  'const accordions = document.querySelectorAll(".accordion__button");'+
  'accordions.forEach(function(accordion) {'+
    'accordion.addEventListener("click", function() {'+
      'const content = this.nextElementSibling;'+
      'let maxH = content.style.maxHeight;'+
      'if (maxH === "0px" || maxH === "") {'+
       ' content.style.maxHeight = "100%";'+
       'content.style.padding = "2%";'+
       
       'content.style.transition= "max-height 0.5s ease-out, padding 0.5s ease-out";'+
        'this.setAttribute("aria-expanded", "true");'+

        
     ' } else {'+
        'content.style.maxHeight = "0";'+
        'content.style.padding = "0 18px";'+
       'content.style.transition= "max-height 0.5s ease-out, padding 0.5s ease-out";'+

        'this.setAttribute("aria-expanded", "false");'+
     ' }'+
    '});'+
  '});'+
'}); <\/script>')
function getLocations() {
  var cities = content.get('City').getValue().split(',').length
  var countries = content.get('Country').getValue().split(',').length
  if (cities > 1 && (countries > 1 || countries == 1)) {
    var templateHTMLMultiCountries = templateHTMLMulti
    return templateHTMLMultiCountries.replace('dropbtn', 'dropbtn location-btn').replace('TARGET', formatLocations(content.get('City').getValue(), content.get('Country').getValue())).replace('NAME', 'View All Locations')
  } else {
    var city = content.get('City').getValue()
    var country = content.get('Country').getValue()
    return (city == "Various" && country == "Various" ? 'Multiple locations' : city + ', ' + country)
  }
}

function getFees() {
  var num = 0;
  var fee = '' + content.get('Program Fee').publish()
  var feeParse = fee.split('|').map(entry => {
    entry = entry.split(': ')
    if (entry.length > 1) {
      num = 1
    }
    if (entry[num] == '') {
      entry[num] = 'Fee not specified'
    } else if (!entry[num].includes('$')) {
      entry[num] = '$' + entry[num]
    }
    return entry.join(': ')
  })
  return num ? makeList(feeParse.join('|'), '|') : feeParse.join('|')
}

function getPreReq() {
  var gpa = get('GPA Requirement', (obj) => {
    return 'GPA Requirement: ' + obj.publish()
  })
  var req = get('Pre-Requisites', (obj) => {
    return gpa ? gpa + ', ' + obj.publish() : obj.publish()
  }, () => {
    return gpa
  })
  return makeList(req || 'Information not specified')
}

var studentContactString = function () {
  var student = content.get('Student Testimonial contact')
  return student == '' ? '' : '- ' + student
}()

var fieldOfStudyHTML = function () {
  var templateHTML = templateHTMLMulti
  var disciplines = get('Disciplines', (args) => {
    return ('' + args.getValue()).split('|').map(study => { return study.wrap(['li', 'a']) }).join('')
  }, noInfoFoundPTag)
  return !(disciplines.indexOf('not specified') > -1) ? (templateHTML.replace('TARGET', disciplines).replace('NAME', 'View all Disciplines')) : disciplines
}()

var buddgetArray = function () {
  var budgetArr = []
  var arr = content.getElements()
  for (var i = 0; i < arr.size(); i++) {
    var name = arr.get(i).getName()
    if (name.indexOf('Program Budget') > -1) {
      var value = arr.get(i).getValue()
      if (value.indexOf('https') > -1) {
        budgetArr.push((name.split('-')[1].trim()).wrap([{ tag: 'a', attributes: 'target="_blank" rel="noopener noreferrer" href="' + value + '" class="btn"' }]))
      } else {
        var fileResolved = getValueFromT4Tag("<t4 type='media' formatter='path/*' id='" + value + "' />")
        if (fileResolved.content) {
          budgetArr.push((name.split('-')[1].trim()).wrap([{
            tag: 'a', attributes: 'target="_blank" rel="noopener noreferrer" href="' + fileResolved.content
              + '" class="btn btn-spacing fees-btn"'
          }]))
        }
      }
    }
  }
  return budgetArr
}()


function showTab(index) {
  var tabs = document.querySelectorAll('.tab-content');
  var tabTitles = document.querySelectorAll('.tab-title');

  for (var i = 0; i < tabs.length; i++) {
    tabs[i].classList.remove('tab-active');
    tabTitles[i].classList.remove('tab-title-active');
  }

  tabs[index].classList.add('tab-active');
  tabTitles[index].classList.add('tab-title-active');
}



var styles = 'aside ul, .info ul {margin-left:1em;}.sock{z-index:1;}.dropbtn{border:none;color:#fff}.dropbtn::after{content:" ▾"}.dropdownWrap{position:relative;display:inline-block}.dropdown-content{overflow-y:auto;display:none;position:absolute;background-color:#f1f1f1;min-width:160px;max-height:300px;box-shadow:0 8px 16px 2px rgba(0,0,0,.2);z-index:1;font-size:.7rem!important}.dropdown-content a{color:#000;padding:12px 16px;text-decoration:none;display:block}.dropdown-content a:hover{background-color:#ddd}.dropdownWrap:hover .dropdown-content{display:block}.dropdownWrap:hover .dropbtn::after{content:"▴"}.dropdownWrap li{list-style:none;text-indent:0;padding-left:0} .callout-card{margin-top: auto !important}' +
  '.text--white{color:white} .btn-spacing{margin: 4px} .ea-hero-tags{border: solid 1px white; border-radius: 8px; text-align:center; margin:4px;} .hero--program-detail.with-photo{background-color:#001e4f}' +
  '.bg--royal {background-color: #001e4f;} .bg--royal.bg--gradient {background-image: -webkit-gradient(linear, left top, right bottom, from(#001e4f), to(#193460));background-image: linear-gradient(to bottom right, #001e4f, #193460);}' +
  '.bg--royal .callout {background-color: #193460;border: none;}.program-info.callout{box-shadow: 3px 3px 4px 0 rgb(100 100 100 / 20%);} .fees-btn{border:none;background-color:#aa0000 !important;color:#ffffff !important;}' +
  '.location-btn{background: inherit;} .tab {overflow: hidden;border: 1px solid #ccc;background-color: #f1f1f1;}' +
  '.tabcontent {display: none;padding: 12px 6px;border: 0px solid #ccc;border-top: none;}.eao-tabs{pointer-events:auto}.eao__tabs__list{display:flex !important;width:auto;justify-content:space-around;}' +
  '.eao-tabs-button{padding:20px;border: 2px solid transparent;background-color:#f9f9f9;border-radius:5px;font-family:inherit;text-align:center;}.eao-tabs-button.active{color: #000000;border-color: #aa0000;background: #ffffff;pointer-events:none;}.tabs-title{margin-bottom:10px;}.subsection-title{margin-bottom:0px}.subsection-lists{margin:1%}.subsection-text{margin-left:2%}' +
  '.subsection li{margin:1%;margin-left:3%; margin-bottom:2%;}.student-journey {max-width: 80%;border-collapse: collapse;table-layout: fixed;display:block;min-height:fit-content;}.student-journey th, .student-journey td {border: 1px solid #ccc;padding: 8px;text-align: left;}.student-journey th {background-color: #004d66;color: white;}' +
  '.student-journey td {background-color: #ffffff;}.student-journey tbody tr:nth-child(even) {background-color: #ffffff} .accordion__content {padding: 0 18px;background-color: white;max-height: 0;overflow: hidden;transition: max-height 0.5s ease-out, padding 0.5s ease-out;}'+
  '.accordion__button { content: "▾" !important; transition: background-color 0.5s ease-out;}.accordion__button[aria-expanded="true"] {background-color: #f0f0f0; content: "\\f078";transform: rotate(180deg);}.closed--accordion{border: 0px solid white}.open--accordion{ padding: 2%; }.hidden{display:none;}.tab-section-title{font-weight:bold;font-size:larger;}.subsection-para{line-height: 1.7;text-align: justify;margin: 15px 0;}'
appendToHtmlTag('head', 'style', styles, 'saStyles')

writeHtml([
  '<div class="hero--basic hero--program-detail bg--dark global-padding--15x with-photo ea-program-detail">',
  // '<img loading="eager" sizes="100vw" src="' + imgStr(62) + '"' + 'srcset="' + imgStr(62) + ' 500w, ' + imgStr(61)+ ' 768w, ' + imgStr(60) + ' 1600w, ' + imgStr(59) + ' 1900w," alt="None">',
  '<div class="grid-container">',
  '<div class="grid-x grid-margin-x">',
  '<div class="cell medium-8">',
  '<div class="hero--basic__text text-margin-reset">',
  '<h1>' + get('Program Title') + '</h1>',
  '<div class="global-spacing--3x"><div>',
  '<div class="grid-container">',
  '<div class="grid-x grid-margin-x">',
  '<div class="ea-hero-tags cell medium-4">',
  '<p><strong>Program Type</strong></p>',
  '<p><i>' + get('Program Type') + '</i></p>',
  '</div>',
  '<div class="ea-hero-tags cell medium-4">',
  '<p><strong>Program Provider</strong></p>',
  '<p><i>' + get('Program Provider') + '</i></p>',
  '</div>',
  '<div class="ea-hero-tags cell medium-4">',
  '<p><strong>Location</strong></p>',
  '<p><i>' + getLocations() + '</i></p>',
  '</div>',
  '</div>',
  '</div>',
  '</div>',
  '</div>',
  '<div class="global-spacing--3x">' + getValueFromT4Tag('<t4 type="navigation" name="Breadcrumbs" id="955" />').content + '</div>',
  '</div>',
  '</div>',
  '<div class="cell medium-4">', //image
  '<img loading="eager" style="min-height:80%;" sizes="100vw" src="' + imgStr(44) + '"' + 'srcset="' + imgStr(45) + ' 500w, ' + imgStr(44) + ' 768w, ' + imgStr(45) + ' 1600w, ' + imgStr(44) + ' 1900w," alt="None">',
  '</div>',
  '</div>',
  '</div>',
  '</div>',
  '<section class="program-info ea-program-detail global-margin--10x even">',
  '<div class="grid-container">',
  '<div class="grid-x grid-margin-x">',
  '<div class="cell medium-8">',
  '<h2>About this Program</h2>',
  '<div class="wysiwyg"><p>' + get('Program Summary HTML') + '</p></div><!-- /.wysiwyg -->',
  '<div class="btn-row global-spacing--3x">',
  // '<ul>',
  // '<li class="external">',
  // '<a href="' + get('Link to Apply') + '" class="btn">Apply Now</a>',
  // '</li>',
  // '</ul>',  
  '<ul>',
  get('Program Website')?('<li class="funderline"><a href="' + get('Program Website') + '" Title="Visit the Program Website">Program Website</a></li>'):'<span class="hidden">No valid link given</span>',
  get('CTA Link Title')?('<li class="funderline"><a href="' + get('CTA Link') + '" Title="Join Canvas">' + get('CTA Link Title') + '</a></li>'):'<span class="hidden">No valid link given</span>',
  '</ul>',
  '</div>',
  '</div>',
  '<div class="cell medium-4" >',
  '<aside class="callout callout-card">',
  '<div class="global-spacing--3x">',
  '<h2 class="eyebrow">Program Overview</h2>',
  '<dl class="global-spacing--2x">',
  '<dt>Program Fee</dt><dd>' + getFees() + '</dd>',
  '<dt>Terms Available</dt><dd>' + get('Terms', makeList, noInfoFoundPTag) + '</dd>',
  '<dt>Application Deadline</dt><dd>' + get('Application Deadline', null, () => { return "Information not specified" }) + '</dd>',
  '</div>',
  '</aside>',
  '<div class="external" style="text-align:center;margin-top:5%;">',
  '<a href="' + get('Link to Apply') + '" class="btn">Apply Now</a>',
  '</div>',
  '</div>',
  '</div>',
  '</div>',
  '</section>',
  '<hr></hr>',
  '<section class="program-info ea-program-detail global-margin--15x" >',
  '<div class="grid-container">',
  '<div class="tabs">', // tabs start
  '<div class="tabs__buttons eao__tabs__list" role="tablist" >', //button for tabs
  '<button class="tablinks tab-title tabs__button eao-tabs eao-tabs-button active" onClick="openCity(event, \'program-details-tab\')" id="program-details" aria-selected="false">Program Details</button>',
  '<button class="tablinks tab-title tabs__button eao-tabs eao-tabs-button"  onClick="openCity(event, \'academics-tab\')" id="academics" aria-selected="false">Academics</button>',
  '<button class="tablinks tab-title tabs__button eao-tabs eao-tabs-button" id="finances" onClick="openCity(event, \'finances-tab\')" aria-selected="false">Finances</button>',
  '<button class="tablinks tab-title tabs__button eao-tabs eao-tabs-button" id="apply" onClick="openCity(event, \'apply-tab\')" aria-selected="false">How To Apply</button>',
  '<button class="tablinks tab-title tabs__button eao-tabs eao-tabs-button" id="country-profile" onClick="openCity(event, \'country-profile-tab\')" aria-selected="false">Country Profile</button>',
  '</div>',
  '<div id="program-details-tab" class="tabcontent" style="display:block;" >', // Tab 1: Program details
  '<dl class="global-spacing--2x">',
  '<div class="grid-container">',
  '<div class="grid-x grid-margin-x">',
  '<div  class="cell medium-auto info">',
  '<div class="grid-container">',
  '<div class="grid-x grid-margin-x">',
  '<div  class="cell medium-8 info">', //left
  '<div class="subsection"><h3 class="subsection-title mt-2">Program Specific Information</h3>',
  '<div class="subsection-text">',
  get('Course(s)') ? ('<dt>Course(s):</dt><dd>' + get('Course(s)') + '</dd>') : '<span class="hidden">No valid text given</span>', //undefined
  get('Program Specific Information') ? ('<dt>Program Features:</dt><dd>' + get('Program Specific Information',makeList, noInfoFoundPTag) + '</dd>') : '<span class="hidden">No valid text given</span>',
  '</div>',
  // '<div class="subsection">',
  // '<dl>',
  // '<dt> Contact </dt>',
  // get('Contact Name')?'<dd>Name: '+get('Contact Name', (text) => { return makeList('' + text.publish(), ';', 'ul') }, () => makeList('Information not specified')) +'</dd>':'<span class="hidden">No valid text given</span>',
  // // '<dd>Email address: </dd>',
  // get('Contact Email')?'<dd>Email: '+get('Contact Email', (text) => { return makeList('' + text.publish(), ';', 'ul') }, () => makeList('Information not specified')) +'</dd>':'<span class="hidden">No valid text given</span>',
  // '</dl>',
  // '</div>',
  '</div>',
  '</div>',
  '<div  class="cell medium-4 info">', //right
  '<aside class="callout callout-card">',
  '<div class="global-spacing--0x">',
  // '<h2 class="eyebrow"></h2>',
  '<dl class="global-spacing--0x">',
  '<dt>Pre-Requisites</dt><dd>' + getPreReq() + '</dd>',
  '<dt>Model</dt><dd>' + get('Model', makeList, noInfoFoundPTag) + '</dd>',
  // '<dt>Level of Immersion</dt>',
  '<dt> Contact </dt>',
  get('Contact Name')?'<dd>Name: '+get('Contact Name', (text) => { return makeList('' + text.publish(), ';', 'ul') }, () => makeList('Information not specified')) +'</dd>':'<span class="hidden">No valid text given</span>',
  // '<dd>Email address: </dd>',
  get('Contact Email')?'<dd>Email: '+get('Contact Email', (text) => { return makeList('' + text.publish(), ';', 'ul') }, () => makeList('Information not specified')) +'</dd>':'<span class="hidden">No valid text given</span>',
  
  '</dl>',
  '</div>',
  '</aside>',
  '</div>',
  '</div>',
  '<blockquote class="subsection"><h3 class="subsection-title">Level of Immersion</h3>',
  '<div class="subsection-text"><strong>Language(s) of Instruction: </strong></div>',
  get('Language(s) of Instruction') ? ('<div class="subsection-text">' + get('Language(s) of Instruction',makeList, noInfoFoundPTag) + '</div>') : '<span class="hidden">No valid text given</span>',
  '<div class="subsection-text"><strong>Features </strong></div>',
  '<div>' + get('Additional Features', makeList, noInfoFoundPTag) + '</div>',
  '</blockquote>',
  '<div class="subsection"><h3 class="subsection-title">Housing Abroad</h3>',
  // '<div><p></p></div>',
  get('Abroad Housing Included')?('<div><p>'+ get('Housing', makeList, noInfoFoundPTag)+'</p></div>'):'<span class="hidden">No valid text given</span>',
  '</div>',
  '</div>', // inside grid div 

  // '<dt class="tabs-title"><h3>Terms Available</h3></dt><dd>' + get('Terms', makeList, noInfoFoundPTag) + '</dd>',
  // '<dt class="tabs-title"><h3>Model</h3></dt>',
  // '<dd>' + get('Model', makeList, noInfoFoundPTag) + '</dd>',
  // '<dt><h3>Eligibility</h3></dt>',
  // '<dd>' + getPreReq() + '</dd>',
  '<div class="global-spacing--5x">', // acc start
  '<div class="accordion flat-base-accordion close--accordion" id="housing-su-accordion">',
  '<button id="housing-su-button"  aria-controls="housing-policy-content" aria-expanded="false" data-toggle-type="menu" aria-label="Additional Fees" class="accordion__button btn btn--small">',
  '<span class="accordion__button-text">Housing</span>',
  '</button>',
  '<div class="panel accordion__content" id="housing-policy-content">',
  '<h3>Housing at Seattle University</h3>',
  '<p>Moving can be both costly and stressful, but careful planning can help minimize both. Start by creating a housing plan for before and after your study abroad experience to avoid the pressure of continuing to pay for rent at home. Program fees typically cover housing abroad, so if you expect to incur additional domestic rent expenses, be sure to include these in your budget. If possible, consider staying with family or friends temporarily before you depart or when you return to save on costs.</p>',
  '<h4>Housing Residence Life</h4>',
  '<p>Education Abroad typically recommends considering Seattle University on-campus housing for when students return from their programs, as Housing Residence Life staff are able to support students in securing housing, while adhering to student preference as best as they can.</p>',
  '<p><strong>Housing Application</strong> (check the Housing Portal for more specific dates)</p>',
  '<ul>',
  '<li>Winter Quarter Housing applications open in November</li>',
  '<li>Spring Quarter Housing applications open in February</li>',
  '<li>Fall Quarter Housing applications open in May</li>',
  '</ul>',
  '</div>',
  '</div>',
  '</div>',//acc end

  '</div>',
  '</div>',
  '</div>',
  '</dl>',
  '</div>',
  '<div id="academics-tab" class="tabcontent">', //Tab 2: Academics
  '<div class="global-spacing--2x">',
  fieldOfStudyHTML ? (['<div class="subsection"><h3 class="subsection-title">Disciplines</h3>',
    '<div style = "margin: 1% 0px;">' + fieldOfStudyHTML + '</div>', '</div>']) : undefined,
  '<div class="subsection"><h3 class="subsection-title">Courseload</h3>',
  '<p>Students who participate in an SU-Sponsored, SU-Exchange, or Non-SU program must be fully enrolled at their host university/program provider. Full-time enrollment on a semester-length program is typically 15 US semester credits (not quarter credits) or 30 ECTS credits. </p>',
  '<p> Note: Not all programs/host universities provide syllabi prior to the start of classes. Some may have samples of past syllabi but cannot guarantee that a specific course will be offered during the student\'s time abroad.</p>',
  '<ul>',
  '<li><b>Credit Range:</b> ' + get('Credit Range') + '</li>',
  '<li><b>Credit System:</b> ' + get('Credit System') + '</li>',
  '<li><b>Typical Course load:</b> ' + get('Average Courseload') + '</li>',
  // '<li><b>Credit Conversion Rate:</b> ' + get('Credit Conversion Rate') + '</li>',
  '<li><b>Credit Per Course:</b> ' + get('Credit Per Course') + '</li>',
  '</ul>',
  '<blockquote class="subsection"><h3 class="subsection-title">Credit Conversion</h3>',
  '<ul>',
  '<li><b>Credit Conversion Rate:</b> ' + get('Credit Conversion Rate') + '</li>',
  '<li><b>Quarter Range:</b> ' + get('Quarter Range') + '</li>',
  '</ul>',
  '</blockquote>',
  '</div>',
  '<div style="text-align:center;" class="section-heading__link global-spacing--2x oho-animate fade-in">',
  '<a href="https://www.seattleu.edu/academics/education-abroad/students/academic-resources/" class="" Title="Historically Approved Courses">Historically Approved Courses</a>',
  '</div>',
  '<div class="global-spacing--5x">', // acc 1 start
  '<div class="accordion flat-base-accordion closed--accordion" id="academic-policy-su-accordion">',
  '<button id="academic-policy-su-button" aria-controls="academic-policy-content" aria-expanded="false" data-toggle-type="menu" aria-label="Academic Policy" class="accordion__button btn btn--small">',
  '<span class="accordion__button-text">Academic Policy</span>',
  '</button>',
  '<div class="panel accordion__content" id="academic-policy-content">',
  '<h3>Academic Policy & Minimum Grade Requirement:</h3>',
  '<ul>',
  '<li>Student will receive transfer credit for their study abroad program and academic grades will not be reflected on their Seattle University transcript and will not be reflected in the Seattle University GPA nor honors calculations.</li>',
  '<li>For all undergraduate programs, courses accepted in transfer are graded at least a C- when letter grades are issued and at least a 1.5 on the decimal grading system. Courses graded D+ or lower (1.5) will not be allowed either for transfer credit or to fulfill degree requirements.</li>',
  '<li>Students in the College of Nursing, the College of Science and Engineering, and communication and psychology majors in the College of Arts and Sciences will be required to repeat courses graded lower than C (2.0) if the course is a major requirement or if it is a prerequisite to a major requirement.</li>',
  '<li>Students in the Albers School of Business and Economics must complete required business courses (including mathematics, economics & accounting) with a grade of C (2.0) or better.</li>',
  '</ul>',
  '</div>',
  '</div>',
  '</div>',//acc end
  '<div class="global-spacing--5x">', // acc 2 start
  '<div class="accordion flat-base-accordion accordion--open" id="credit-transfer-su-accordion">',
  '<button id="credit-transfer-su-button" aria-controls="transfer-policy-content" aria-expanded="false" data-toggle-type="menu" aria-label=" Transfer of Credit & Placeholder Course" class="accordion__button btn btn--small">',
  '<span class="accordion__button-text"> Transfer of Credit & Placeholder Course</span>',
  '</button>',
  '<div class="panel accordion__content" id ="transfer-policy-content">',
  '<h3>Transfer Credits</h3>',
  '<p>Letter grades received on this program will not transfer to SU nor factor into Seattle University GPA. If students receive the minimum grade required, credits will transfer toward their Seattle University degree as approved through the required pre-departure Course Approval process. Minimum grade details will be specified during Course Approval for each course taken abroad.</p>',
  '<h3>Placeholder Course</h3>',
  '<p>The Education Abroad Office will enroll students in a 12-credit placeholder course per term that you are abroad so that students maintain full-time student status and are billed properly. This placeholder course will be replaced by the courses taken abroad upon successful completion and receipt of official transcript.</p>',
  '</div>',
  '</div>',
  '</div>',//acc end
  // '<dd>' + fieldOfStudyHTML + '</dd>',`
  '</div>',
  '</div>',
  '<div id="finances-tab" class="tabcontent">', // Tab 3: Finances
  '<div class="global-spacing--2x">',
  '<div class="subsection"><h3 class="subsection-title">Program Fees</h3>',
  '<p class="subsection-text">Program fees are subject to change and based on previous year\'s tuition, if future tuition rates are not available yet. The purpose of the budget worksheets is to provide an estimate of how much studying abroad is going to cost. Actual spending may vary.</p>',
  '<p class="subsection-lists">' + getFees() + '</p></div>',
  '<div><h3 class="subsection-title">Requesting a Financial Aid Estimate</h3>',
  '<p class="subsection-text">Student Financial Aid allows students to request a financial aid estimate when planning an education abroad experience. Students can bring the completed worksheet of your preferred program to a meeting with a Student Financial Aid Counselor. <p></div>',
  '<div class="subsection"><h3 class="subsection-title">Budget Worksheets</h3>',
  buddgetArray.length > 0 ? ['<div class="global-spacing--2x">',
    // '<dt><h4>Budgets by Term</h4></dt>',
    buddgetArray,
    '</div>', '</div>'] : undefined,
  '<div><h3 class="subsection-title">Participation Costs</h3></div>',
  get('Participation Costs') ? ('<div class="subsection-para">' + get('Participation Costs') + '</div>') : '<span class="hidden">No valid text given</span>',
  get('Payment') ? ('<div class="subsection-para">' + get('Payment') + '</div>') : '<span class="hidden">No valid text given</span>',
  
  get('Insurance') ? ('<div><h3 class="subsection-title">Insurance</h3></div><div class="subsection-para">' + get('Insurance') + '</div>') : '<span class="hidden">No valid text given</span>',
  '<div><h3 class="subsection-title">Scholarships</h3>',
  // '<p>There are many study abroad scholarships for all program types. The application process may be easier than you think, but planning ahead is key. Deadlines are often 6-8 months in advance of departure. Check out the <a heref="'+get('Program Scholarships')+'">Scholarship section</a> of Seattle University Education Abroad website for more information on scholarships and how to apply. </p>',
  '<p>There are many study abroad scholarships for all program types. The application process may be easier than you think, but planning ahead is key. Deadlines are often 6-8 months in advance of departure. Check out the Scholarship section of Seattle University Education Abroad website for more information on scholarships and how to apply. </p>',
  // [Program Scholarships/Column BF]
  '</div>',
  '<div style="text-align:center;" class="section-heading__link global-spacing--2x oho-animate fade-in">',
  //button with href
  '<a href="https://www.seattleu.edu/academics/education-abroad/students/financial-planning/estimated-cost-comparison-calculator/">Cost Comparison Calculator</a>',
  '</div>',
  '</div>',
  '</div>',
  '<div id="apply-tab" class="tabcontent">', // Tab 4: How to apply
  '<div class="global-spacing--2x">',
  '<div class="subsection-title"><h3>Student Journey</h3>',
  '<table class="student-journey">', //table start
  '<thead>',
  '<tr>',
  ' <th>Approximate Timeline</th>',
  '<th>Phase</th>',
  '<th>More details</th>',
  '</tr>',
  ' </thead>',
  '<tbody>',
  '<tr>',
  '<td>Sept-Jan</td>',
  '<td>Exploration</td>',
  '<td>Students will work with Education Abroad and various supporters (family, academic advisor, etc.) to find a program that best fits student\'s academic, personal, and professional goals.</td>',
  '</tr>',
  '<tr>',
  '<td>Feb 1</td>',
  '<td>Apply</td>',
  '<td>Students will have the opportunity to apply to SU-Sponsored and SU-Exchange programs during next academic year in the Fall around November. The hard deadline is February 1st.</td>',
  '</tr>',
  '<tr>',
  '<td>Late Feb/Early Mar</td>',
  '<td>Nominations</td>',
  '<td>Education Abroad Office will nominate selected students for SU-Sponsored and SU-Exchange programs.</td>',
  '</tr>',
  '<tr>',
  '<td>Mar-May (Fall)<br>Sept-Dec (Winter)<br>Jan-March (Spring)</td>',
  '<td>Preparation</td>',
  '<td>Students will complete secondary applications for program providers/host university in preparation of going abroad. Additional preparatory steps include pre-departure orientation, courses approvals, Health Check, Visa application, planning housing arrangements (abroad & Seattle), immunizations, etc.</td>',
  '</tr>',
  ' </tbody>',
  '</table>',
  '</div>',
  '<div class="subsection-title"><h3>Application Steps</h3></div>',
  get('Application Instructions', (text) => { return makeList('' + text.publish(), '|', 'ol') }, () => makeList('Information not specified')),('If you haven’t joined the Education Abroad Canvas Course yet, ' + ('Join Now!'.wrap([{ attributes: 'href="https://forms.office.com/Pages/ResponsePage.aspx?id=UuAQvBywSUiZZ-5-x0_J2CrqSVSnPn9KtGVI66pTpfNUNTZYMTFSWUsxVlIxUFU1TVhLQkEzQlFZSyQlQCN0PWcu"', tag: 'a' }])) + '').wrap('p'),
  '<div class="subsection-title"><h3>Visa Requirements</h3>',
  '<blockquote class="subsection"><h4 class="subsection-title">What is a Visa</h4>',
  '<p >A visa is a permission granted by a country that allows foreign nationals to enter and reside there temporarily. Applicants typically need to provide documentation such as an acceptance letter from the educational institution, proof of financial means, and health insurance. Student visas come with specific regulations regarding work rights, travel restrictions, and duration of stay, varying by country.</p>',
  '</blockquote>',
  get('Visa Overview') ? ('<div class="subsection-para">' + get('Visa Overview') + '</div>') : '<span class="hidden">No valid text given</span>',
  '</div>',
  '</div>',
  '</div>',
  '<div id="country-profile-tab" class="tabcontent">', // Tab 5: Country Profile
  '<div class="global-spacing--5x">',
  '<h3> Climate </h3>',
  '<h3> Travel Resources </h3>',
  '<h3> Cultural Resources </h3>',
  '<h3> Food & Diet </h3>',
  '<h3> Embassy/Consulate </h3>',
  '<h3> Identity-Specific Considerations </h3>',

  '</div>',
  '</div>',
  '</div>', // tab end 
  '</div>', // 
  '</section>',
  '<hr></hr>',
  get('Youtube Id') ? ['<section class="gallery ea-program-detail global-padding--2x even">',
    '<div class="grid-container oho-animate-sequence oho-animate--in">',
    '<div class="grid-x grid-margin-x">',
    '<div class="cell auto">',
    '<div class="section-heading--basic text-margin-reset">',
    '<h2 class="oho-animate fade-in oho-animate--in">The experience at a glance</h2>',
    '</div>',
    '</div>',
    '</div>',
    '<div class="grid-x grid-margin-x">',
    '<div class="cell initial-1"></div>',
    '<div class="cell initial-10">',
    '<div class="global-spacing--6x">',
    '<iframe style="width:100%; height:40vw" src="https://www.youtube.com/embed/' + (get('Youtube Id').getValue()).match(youtubeRegex)[6] + '"'
    + ' title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>',
    '</div>',
    '</div>',
    '<div class="cell initial-1"></div>',
    '</div>',
    '</div>',
    '</section>',] : undefined,
  '<section class="program-info ea-program-detail global-margin--15x odd">',
  '<div class="grid-container">',
  '<div class="grid-x grid-margin-x">',
  '<div class="cell medium-2"></div>',
  '<div class="cell medium-8 info">',
  '<div class="global-spacing--3x">',
  '<div class="section-heading--basic text-margin-reset">',
  '<h2>Map</h2>',
  '</div>',
  '<div id="map" class="ea-program-map">',
  '</div>',
  '</div>',
  '</div>',
  '<div class="cell medium-2"></div>',
  '</div>',
  '</div>',
  '</section>',
])



function markupLink(str) {
  var regexMarkup = str.match(/\[(.+)\]\(([^ ]+?)( "(.+)")?\)/)
  if (regexMarkup) {
    str = str.replace(regexMarkup[0], '<a href="' + regexMarkup[2] + '">' + regexMarkup[1] + '</a>')
  }
  return str
}

function makeList(str, del, type, item) {
  var arr
  if (!del) del = ','
  if (!type) type = 'ul'
  if (!item) item = 'li'
  // Allows us to parse both types of strings in the context of T4
  try {
    arr = str.getValue().split(del)
  } catch (e) {
    arr = str.split(del)
  }
  for (let i = 0; i < arr.length; i++) {
    arr[i] = markupLink(arr[i].wrap(item))
  }
  return arr.join('').wrap(type)
}



function formatLocations(cities, countries) {
  cities = cities.split(',')
  countries = countries.split(',')

  var tempArr = []
  var countriesCounter = 0
  for (var i = 0; i < cities.length; i++) {
    var locationStr = cities[i] == countries[countriesCounter] ? cities[i] : cities[i] + ', ' + countries[countriesCounter]
    tempArr.push((locationStr).wrap(['li', 'a']))
    if (countries[countriesCounter + 1]) {
      countriesCounter++
    }
  }
  return tempArr.join('')
}

function formatContact() {
  var names = (get('Contact Name').getValue() || '').split('; ');
  var emails = (get('Contact Email').getValue() || '').split('; ');
  var tempArr = [];
  for (var i = 0; i < names.length; i++) {
    var name = names[i] || 'Name Not Available';
    var email = emails[i] || 'Email Not Available';
    tempArr.push('<dd>Name: ' + name + '</dd>');
    tempArr.push('<dd>Email address: ' + email + '</dd>');
  }

  return tempArr.join('');
}

function get(name, cbSuccess, cbFail) {
  var rawObject = content.get(name)
  return rawObject.getValue() == ''
    ? (cbFail ? cbFail()
      : null)
    : (cbSuccess ? cbSuccess(rawObject)
      : rawObject)
}

function noInfoFoundPTag() {
  return 'Information not specified'.wrap('p')
}

// https://stackoverflow.com/questions/6671183/calculate-the-center-point-of-multiple-latitude-longitude-coordinate-pairs
function GetCenterFromDegrees(data) {
  if (!(data.length > 0)) { return false; }
  var num_coords = data.length;
  var X = 0.0;
  var Y = 0.0;
  var Z = 0.0;
  for (i = 0; i < data.length; i++) {
    var lat = data[i][0] * Math.PI / 180;
    var lon = data[i][1] * Math.PI / 180;
    var a = Math.cos(lat) * Math.cos(lon);
    var b = Math.cos(lat) * Math.sin(lon);
    var c = Math.sin(lat);
    X += a;
    Y += b;
    Z += c;
  }
  X /= num_coords;
  Y /= num_coords;
  Z /= num_coords;
  var lon = Math.atan2(Y, X);
  var hyp = Math.sqrt(X * X + Y * Y);
  var lat = Math.atan2(Z, hyp);
  var newX = (lat * 180 / Math.PI);
  var newY = (lon * 180 / Math.PI);
  return new Array(newX, newY);
}