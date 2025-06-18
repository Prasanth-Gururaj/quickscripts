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
var templateHTMLMulti = '<div class="dropdownWrap"><button class="dropbtn location-btn" id="dropdownMenuButton">NAME</button><div class="dropdown-content">TARGET</div></div>'

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

function getLocations() {
  var cities = content.get('City').getValue().split(',').length
  var countries = content.get('Country').getValue().split(',').length
  if (cities > 1 && (countries > 1 || countries == 1)) {
    var templateHTMLMultiCountries = templateHTMLMulti
    return templateHTMLMultiCountries.replace('TARGET', formatLocations(content.get('City').getValue(), content.get('Country').getValue())).replace('NAME', 'View All Locations')
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
    return 'GPA: ' + obj.publish()
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




var styles = 'aside ul, .info ul {margin-left:1em;}.sock{z-index:1;}.dropbtn{border:none;color:#fff}.dropbtn::after{content:" ▾"}.dropdownWrap{position:relative;display:inline-block}.dropdown-content{overflow-y:auto;display:none;position:absolute;background-color:#f1f1f1;min-width:160px;max-height:300px;box-shadow:0 8px 16px 2px rgba(0,0,0,.2);z-index:1;font-size:.7rem!important}.dropdown-content a{color:#000;padding:12px 16px;text-decoration:none;display:block}.dropdown-content a:hover{background-color:#ddd}.dropdownWrap:hover .dropdown-content{display:block}.dropdownWrap:hover .dropbtn::after{content:"▴"}.dropdownWrap li{list-style:none;text-indent:0;padding-left:0} .callout-card{margin-top: auto !important}' +
  '.text--white{color:white} .btn-spacing{margin: 4px} .ea-hero-tags{border: solid 1px white; border-radius: 8px; text-align:center; margin:4px;} .hero--program-detail.with-photo{background-color:#001e4f}'+
  '.bg--royal {background-color: #001e4f;} .bg--royal.bg--gradient {background-image: -webkit-gradient(linear, left top, right bottom, from(#001e4f), to(#193460));background-image: linear-gradient(to bottom right, #001e4f, #193460);}'+
  '.bg--royal .callout {background-color: #193460;border: none;}.program-info.callout{box-shadow: 3px 3px 4px 0 rgb(100 100 100 / 20%);} .fees-btn{border:none;background-color:#aa0000 !important;color:#ffffff !important;}'+
  '.location-btn{background: inherit;}'
appendToHtmlTag('head', 'style', styles, 'saStyles')

writeHtml([
  '<div class="hero--basic hero--program-detail bg--dark global-padding--15x with-photo ea-program-detail">',
  // '<img loading="eager" sizes="100vw" src="' + imgStr(62) + '"' + 'srcset="' + imgStr(62) + ' 500w, ' + imgStr(61)+ ' 768w, ' + imgStr(60) + ' 1600w, ' + imgStr(59) + ' 1900w," alt="None">',
  '<div class="grid-container">',
  '<div class="grid-x grid-margin-x">',
  '<div class="cell auto">',
  '<div class="hero--basic__text text-margin-reset">',
  '<h1>' + get('Program Title') + '</h1>',
  '<div class="global-spacing--3x"><div>',
  '<div class="grid-container">',
  '<div class="grid-x grid-margin-x">',
  '<div class="ea-hero-tags cell medium-3">',
  '<p><strong>Program Type</strong></p>',
  '<p><i>' + get('Program Type') + '</i></p>',
  '</div>',
  '<div class="ea-hero-tags cell medium-3">',
  '<p><strong>Program Provider</strong></p>',
  '<p><i>' + get('Program Provider') + '</i></p>',
  '</div>',
  '<div class="ea-hero-tags cell medium-3">',
  '<p><strong>Location</strong></p>',
  '<p><i>' + getLocations() + '</i></p>',
  '</div>',
  '</div>',
  '</div>',
  '</div></div>',
  '<div class="global-spacing--3x">' + getValueFromT4Tag('<t4 type="navigation" name="Breadcrumbs" id="955" />').content + '</div>',
  '</div>',
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
  '<li class="funderline"><a href="' + get('Program Website') + '" Title="Visit the Program Website">Program Website</a></li>',
  '<li class="funderline"><a href="' + get('CTA Link') + '" Title="Join Canvas">' + get('CTA Link Title') + '</a></li>',
  '</ul>',
  '</div>',
  '</div>',
  '<div class="cell medium-4" style="text-align:center;">',
  //       '<aside class="callout callout-card">',
  // '<div class="global-spacing--3x">',
  //         '<h2 class="eyebrow">Program Overview</h2>',
  //         '<dl class="global-spacing--2x">',
  //         '<dt>Program Type</dt>',
  //         '<dd>' + get('Program Type') + '</dd>',
  //         '<dt>Program Provider</dt>',
  //         '<dd>' + get('Program Provider') + '</dd>',
  //         '<dt>Location</dt>',
  //         '<dd>' + getLocations() + '</dd>',
  //         '<dt>Program Fee</dt><dd>' + getFees() + '</dd>',
  //         '<dt>Terms Available</dt><dd>' + get('Terms', makeList, noInfoFoundPTag) + '</dd>',
  //         '<dt>Pre-Requisites</dt><dd>' + getPreReq() + '</dd>',
  //         '<dt>Application Deadline</dt><dd>' + get('Application Deadline', null, () => {return "Information not specified"}) + '</dd>',
  // '</div>',      
  // '</aside>',
  '<img loading="eager" style="margin-top:30%;min-height:60%;margin-bottom:10%;max-width:120%" sizes="100vw" src="' + imgStr(62) + '"' + 'srcset="' + imgStr(62) + ' 500w, ' + imgStr(61) + ' 768w, ' + imgStr(60) + ' 1600w, ' + imgStr(59) + ' 1900w," alt="None">',
  '<div class="external" style="width:120%;">',
  '<a href="' + get('Link to Apply') + '" class="btn">Apply Now</a>',
  '</div>',
  '</div>',
  '</div>',
  '</div>',
  '</section>',
  '<section class="program-info ea-program-detail global-margin--15x odd bg--dark bg--royal bg--gradient text--white">',
  '<div class="grid-container">',
  '<div class="grid-x grid-margin-x">',
  '<div class="cell medium-8 info">',
  '<div class="global-spacing--3x">',
  '<h2>Housing</h2>' + get('Abroad Housing Included', (text) => {
    return ('Housing ' + (('' + text.publish()).toLowerCase().indexOf('yes') > -1 ? 'is' : 'is not') + ' included' + get('Housing', makeList, () => {
      return ''
    })).wrap(['ul', 'li'])
  }, noInfoFoundPTag),
  '</div>',
  get('Student Testimonial') ? ['<div class="global-spacing--3x">',
    '<h2>Student Testimonial</h2>' + (get('Student Testimonial') + studentContactString).wrap('p'),
    '</div>'] : undefined,
  '<div class="global-spacing--3x">',
  '<h2>Program Dates</h2>' + get('Program Dates', (text) => { return makeList(String(text.publish()), '|') }, () => makeList('Information not specified')),
  '</div>',
  '<div class="global-spacing--3x">',
  '<h2>Application Steps</h2>' + get('Application Instructions', (text) => { return makeList('' + text.publish(), '|', 'ol') }, () => makeList('Information not specified')),
  ('If you haven’t joined the Education Abroad Canvas Course yet, ' + ('Join Now!'.wrap([{ attributes: 'href="https://forms.office.com/Pages/ResponsePage.aspx?id=UuAQvBywSUiZZ-5-x0_J2CrqSVSnPn9KtGVI66pTpfNUNTZYMTFSWUsxVlIxUFU1TVhLQkEzQlFZSyQlQCN0PWcu"', tag: 'a' }])) + '').wrap('p'),
  '</div>',
  '</div>',
  '<div class="cell medium-4">',
  '<div class="global-spacing--10x">',
  '<aside class="callout callout-card">',
  '<h2 class="eyebrow">Program Overview</h2>',
  '<dl class="global-spacing--2x">',
  '<dt>Program Fee</dt><dd>' + getFees() + '</dd>',
       '<dt>Terms Available</dt><dd>' + get('Terms', makeList, noInfoFoundPTag) + '</dd>',
  '<dt>Pre-Requisites</dt><dd>' + getPreReq() + '</dd>',
      '<dt>Application Deadline</dt><dd>' + get('Application Deadline', null, () => {return "Information not specified"}) + '</dd>',
  '<h2 class="eyebrow">Program Features</h2>',
  '<dl class="global-spacing--2x">',
  '<dt>Model</dt>',
  '<dd>' + get('Model', makeList, noInfoFoundPTag) + '</dd>',
  '<dt>Features</dt>',
  '<dd>' + get('Additional Features', makeList, noInfoFoundPTag) + '</dd>',
  '<dt>Fields of study</dt>',
  '<dd>' + fieldOfStudyHTML + '</dd>',
  '</aside>',
  '</div>',
  '</div>',
  '</div>',
  '</div>',
  '</section>',
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
  '<section style="padding:2%;" class="program-info ea-program-detail global-margin--15x  bg--dark bg--royal bg--gradient text--white">',
  '<div class="grid-container">',
  '<div class="grid-x grid-margin-x">',
  '<div class="cell medium-8 info">',
  get('Scholarships') ? ['<div class="global-spacing--3x">',
    '<h2>Scholarships</h2>',
    (get('Scholarships').getValue()).wrap('p'),
    get('Program Scholarships', (text => {
      return text.getValue().match(/\[(.+)\]\(([^ ]+?)( "(.+)")?\)/)
        ? makeList(text.getValue(), '|') : makeList(text.getValue().wrap([{ attributes: 'href="' + text.getValue() + '"', tag: 'a' }]))
    })),
    '</div>',] : undefined,
  '<div class="global-spacing--3x">',
  '<h2>Credits</h2>',
  '<ul>',
  '<li><b>Credit Range:</b> ' + get('Credit Range') + '</li>',
  '<li><b>Credit System:</b> ' + get('Credit System') + '</li>',
  '<li><b>Credit Conversion Rate:</b> ' + get('Credit Conversion Rate') + '</li>',
  '<li><b>Quarter Range:</b> ' + get('Quarter Range') + '</li>',
  '<li><b>Credit Per Course:</b> ' + get('Credit Per Course') + '</li>',
  '<li><b>Average Courseload:</b> ' + get('Average Courseload') + '</li>',
  '</ul>',
  '</div>',
  '</div>',
  '<div class="cell medium-4">',
  '<div class="global-spacing--10x">',
  '<aside class="callout callout-card">',
  '<h2 class="eyebrow">Program Budgets</h2>',
  buddgetArray.length > 0 ? ['<dl class="global-spacing--2x">',
    '<dt>Budgets by Term</dt>',
    buddgetArray,
    '</dl>'] : undefined,
  '</aside>',
  '</div>',
  '</div>',
  '</div>',
  '</div>',
  '</section>',
  // get('Youtube Id') ? ['<section class="gallery ea-program-detail global-padding--15x bg--dark bg--teal bg--gradient">',
  //   '<div class="grid-container oho-animate-sequence oho-animate--in">',
  //   '<div class="grid-x grid-margin-x">',
  //   '<div class="cell auto">',
  //   '<div class="section-heading--basic text-margin-reset">',
  //   '<h2 class="oho-animate fade-in oho-animate--in">The experience at a glance</h2>',
  //   '</div>',
  //   '</div>',
  //   '</div>',
  //   '<div class="grid-x grid-margin-x">',
  //   '<div class="cell initial-1"></div>',
  //   '<div class="cell initial-10">',
  //   '<div class="global-spacing--6x">',
  //   '<iframe style="width:100%; height:40vw" src="https://www.youtube.com/embed/' + (get('Youtube Id').getValue()).match(youtubeRegex)[6] + '"'
  //   + ' title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>',
  //   '</div>',
  //   '</div>',
  //   '<div class="cell initial-1"></div>',
  //   '</div>',
  //   '</div>',
  //   '</section>',] : undefined,
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
  var names = (get('Contact Name').getValue()).split('; ')
  var emails = (get('Contact Email').getValue()).split('; ')

  var tempArr = []
  var emailsCounter = 0
  for (var i = 0; i < names.length; i++) {
    tempArr.push('<a href="mailto:' + emails[i] + '">' + names[i] + '</a>')
    if (emails[emailsCounter + 1]) {
      emailsCounter++
    }
  }
  return makeList(tempArr.join('; '), '; ')
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