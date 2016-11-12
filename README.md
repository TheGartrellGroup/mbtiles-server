mbtiles-server
==============

This is a fork of Tobin Bradley's fork of Christopher Helm's awesome [mbtiles-server](https://github.com/chelm/mbtiles-server). All credit should be flung at them. 

The changes in this fork are:

* Support for ESRI bundle tile cache format

put your bundled cache directory in the same directory as your raster and vector mbtiles.

(this script assumes that your cache was published in a dataframe named "Layers")

Requests look like this:

``` text
http://localhost:3000/<mbtiles-name>/3/1/2.png.
```

or this
``` text
http://localhost:3000/<mbtiles-name>/3/1/2.pbf.
```