A source in Biodalliance is essentially a class, subclassing
FeatureSourceBase (found in XXX). It implement a fetch method,
with the signature:

```javascript
fetch(chr, min, max, scale, types, pool, callback)
```

where the first three arguments specify the location of the features
to fetch - min and max are specified in basepairs - and `callback`
is a function with the following signature.

```javascript
callback(status, features, scale)
```

`status` is a string that will be displayed over the track, generally
used for messaging errors to the user. `features` is the array of
`DASFeature`s that will be displayed by the browser.

What `fetch` does, then, is to fetch the data to be displayed, from
wherever it may be stored, and process it into an array of features
that the browser will display. It should end with returning the result
of calling the callback: `return callback(status, features, scale)`.
Usually the status will be null, and the scale is a number used by
BD to decide which style to use, if there are several defined for
different zoom levels.

A `DASFeature` is simply a Javascript object. It should have `min`
and `max` fields, in basepairs, which specify the horizontal position
of the feature. If the feature should have a vertical position, it's
given by the `score` field.

What a source looks like is defined by its stylesheet. There are three
ways to define a source's stylesheet: defining it in an XML file,
giving it to the source at the config level in JSON format, or implementing
a `getStyleSheet` function on the source. That function takes a callback
as argument, and should end by returning the result of calling the callback
on a `DASStylesheet`, filled with styles.
