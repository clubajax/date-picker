# Date Picker

Calendar custom elements, including a date picker and a date range picker.

## Installation

To install:

    npm install clubajax/date-picker
    
Bower will also work.

You can also clone the repository with your generic clone commands as a standalone 
repository or submodule.
	  
	git clone git://github.com/clubajax/date-picker.git
	
## Demo 

See the [demo here](https://clubajax.github.io/date-picker.html).

## Dependencies

 * [clubajax/on](https://github.com/clubajax/on)
 * [clubajax/dom](https://github.com/clubajax/dom) 
 * [clubajax/BaseComponent](https://github.com/clubajax/BaseComponent)
 * [clubajax/custom-elements-polyfill](https://github.com/clubajax/custom-elements-polyfill)
 
BaseComponent is used as a base for custom elements, and the polyfill is so it works on any modern browser.

### date-input

An input with the text restricted to a date format. On focus, opens a date-picker calendar.

Usage:
```jsx harmony
<date-input value="12/25/2017" label="Enter Date" name="date-field" />
```
### date-range-input

An input with the text restricted to *two* date formats. On focus, opens a date-range-picker calendar.

Usage:
```jsx harmony
<date-range-input value="11/20/2017 - 12/25/2017" label="Enter Range" name="range-field" />
```

Both components will emit change events, upon completion of a valid date.

### Attributes

 * **min** Do not allow a date selection before this date
 * **max** Do not allow a date selection after this date
 
Usage:
```jsx harmony
<date-input value="12/25/2017" label="Enter Date" name="date-field" min="12/05/2017" max="12/31/2017" />
```
 
## TODO

Features coming soon:
 * Separate input date range pickers

## License

[Free as in beer.](./LICENSE)