Built on top of standard JS frameworks, Regulome Explorer (RE) is a suite of tools for scientists, computational biologists, and other users to explore, mine and visualize large complex data sets.   Data is brought together using several visualization tools in the browser.  This code repository is currently focused on the Multi-Scale Explorer which features a circular ideogram layout, a linear multi-track browser, and several 2D plots.

# Updates #

## 05/02/2012 ##
Added local distribution of Regulome Explorer with dependencies into the Downloads section ([RE\_local.zip](http://regulome-explorer.googlecode.com/files/RE_local.zip)).

## 02/22/2012 ##
The Multi-scale explorer code libraries are being posted to a CDN hosted by Amazon Web Services and mapped to cdn.cancerregulome.org.  We are implementing a versioning and bug fix procedure for the code.  At the moment the code is largely in flux.  CDN updates will not show up until the cache is refreshed for each server that the code is served on closest to the request.

Initial load times have dropped precipitously as a result of the CDN.  In the future, the code will be minified/uglified and compressed into a few high density libraries which should also result in another speedup of script load time.

The majority of user experience load time is the data query/load/clean/render.  This code will be further worked on to increase performance, but it will always be a barrier.  [WebStorage](http://dev.w3.org/html5/webstorage/) can be used to help with common queries (the default and other queries that the user often performs).  CDN does not offer any help here.

The remaining configuration files (index.html, association.js, global.js, icons.css) define the individual instance of multi-scale explorer.