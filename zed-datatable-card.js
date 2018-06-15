import '../@polymer/polymer/polymer-legacy.js';
import './bwt-datatable.js';
import '../@polymer/paper-material/paper-material.js';
import '../@polymer/paper-dropdown-menu/paper-dropdown-menu.js';
import '../@polymer/paper-listbox/paper-listbox.js';
import '../@polymer/paper-item/paper-item.js';
import '../@polymer/paper-icon-button/paper-icon-button.js';
import '../@polymer/paper-progress/paper-progress.js';
import '../@polymer/iron-flex-layout/iron-flex-layout-classes.js';
import '../@polymer/paper-styles/element-styles/paper-material-styles.js';
import { IronResizableBehavior } from '../@polymer/iron-resizable-behavior/iron-resizable-behavior.js';
import { IronScrollTargetBehavior } from '../@polymer/iron-scroll-target-behavior/iron-scroll-target-behavior.js';
import { Polymer } from '../@polymer/polymer/lib/legacy/polymer-fn.js';
import { dom } from '../@polymer/polymer/lib/legacy/polymer.dom.js';

/*
 A [material design implementation of the tables within cards spec](https://www.google.com/design/spec/components/data-tables.html#data-tables-tables-within-cards).


 @element paper-datatable-card
 @demo demo/users-card.html Polished demo
 @demo demo/paper-datatable-card.html Complex demo
 */

Polymer({

    is: 'paper-datatable-card',
    properties: {
        /**
         * Heading shown above the data table
         *
         * @attribute String
         * @default ''
         * @type Object
         */
        header: String,
        /**
         * See general documentation.
         *
         * @attribute dataSource
         * @type Object
         */
        dataSource: Object,
        /**
         * Number of items per page
         *
         * @attribute pageSize
         * @default 10
         * @type Number
         */
        pageSize: {
						type: Number,
						value: 10,
						notify: true,
						observer: "_pageSizeChanged"
        },
        /**
         * Possible number of items per page
         *
         * @attribute pageSizeOptions
         * @default [5, 10, 25, 100]
         * @type Array
         */
        pageSizeOptions: {
						type: Array,
						value: [5, 10, 25, 100],
						notify: true
        },
        /**
         * Current page shown
         *
         * @attribute Number
         * @default 1
         * @type Object
         */
        page: {
						type: Number,
						value: 1,
						notify: true
        },
        _disableSave: {
						type: Boolean,
						value: false
        },
        _datatable: {
						type: Object
        },
        /**
         * Used when the value is `undefined`.
         *
         * @attribute default
         * @type Object
         */
        default: {
						type: Object
        },
        /**
         * Property containing the `id` of every row. It is **important** this is available for multi-page selection to work
         *
         * @attribute idProperty
         * @type String
         * @default 'id'
         * @required
         */
        idProperty: {
						type: String,
						value: 'id'
        },
        /**
         * An array of selected row id's.
         *
         * @attribute selectedIds
         * @type Array
         * @default []
         */
        selectedIds: {
						type: Array,
						notify: true,
						value: []
        },
        _cacheUsed: {
						type: Boolean
        },
        _sortDirection: {
						type: String,
						value: 'asc'
        },
        _sortProperty: {
						type: String
        },
        _headerDistanseToTop: {
						type: Number
        },
        /**
         * Fix table header to the top of the page on scroll
         *
         * @attribute headerFixed
         * @type Boolean
         * @default false
         */
        headerFixed: {
						type: Boolean,
						reflectToAttribute: true,
            value: false
        },
        _selectedToolbarVisible: Boolean,
        _singleSelectToolbarVisible: Boolean,
        _multiSelectToolbarVisible: Boolean,
        _numberOfSelectedIds: Number,
        _numberOfItems: Number
    },
    ready: function(){
        this._datatable = dom(this).querySelector("paper-datatable");
        this._datatable.data = [];
        this._datatable.addEventListener("data-changed", this._triggerSave.bind(this));
        this._datatable.addEventListener("sort", this._handleSort.bind(this));
        this._datatable.addEventListener("selection-changed", this._setSelectedIds.bind(this));
        this._datatable.addEventListener("selection-changed", this._setSelectedToolbarVisible.bind(this));
        this._datatable.addEventListener("toggle-all", this._toggleAll.bind(this));
        this._datatable._setPartialSelection = function(){};
        this.set('selectedIds', []);
        this.set('_sortProperty', this.idProperty);
    },
    behaviors: [
        IronResizableBehavior,
        IronScrollTargetBehavior
    ],
    listeners: {
        'iron-resize': '_resizeHandler'
    },
    observers: [
        'retrieveVisibleData(dataSource, page, _datatable, _sortDirection, _sortProperty)',
        '_setNumberOfItems(dataSource.length)',
        '_createCache(dataSource.queryForIds)'
    ],
    /**
     * Scroll listener from IronScrollTargetBehavior
     */
    _scrollHandler: function () {
        if (this.headerFixed) {
						var paperDatatable = dom(this).querySelector("paper-datatable");
						var header = this.shadowRoot.querySelector('#topBlock');
						var headerStyles = getComputedStyle(header);
						if (this._scrollTop > this._headerDistanseToTop && !header.classList.contains("fixedToTop")) {
                header.style.width = headerStyles.width;
                paperDatatable.style.paddingTop = header.offsetHeight+"px";
                header.classList.add("fixedToTop");
						} else if (this._scrollTop < this._headerDistanseToTop && header.classList.contains("fixedToTop")) {
                header.style.width = "auto";
                header.style.top = 0;
                paperDatatable.style.paddingTop = 0;
                header.classList.remove("fixedToTop");
						}
        }
    },
    /**
     * Set scroll target and check coordinates to top
     */
    _resizeHandler: function() {
        if (this.headerFixed && !this._headerDistanseToTop) {
						var header = this.shadowRoot.querySelector('#topBlock');
						this._headerDistanseToTop = header.getBoundingClientRect().top;
        };
    },
    _pageSizeChanged: function() {
        if (this.page > 1) {
						this.firstPage();
        } else {
						this.retrieveVisibleData();
        }
    },
    _createCache: function(){
        this._cacheUsed = true;
        this._cache = new WeakCache(100);
    },
    _triggerSave: function(ev){
        if(this.dataSource) {
						if (!this._disableSave && ev.detail.path) {
                var path = ev.detail.path.split(".");
                if (path.length == 2) {
                    return;
                }
                var item = path.shift();
                var rowKey = path.shift();
                var property = path.shift();
                this.debounce('save'+rowKey+property, function(){
                    var value = ev.detail.value;
                    var data = this._datatable.get(['data', rowKey]);
                    if(!data){
                        return console.warn('Some elements (like the \<google-map\>) will trigger erroneous' +
                                ' change notifications. Sadly this causes the paper-datatable to error out' +
                                ' when browsing too quickly.');
                    }
                    var id = data[this.idProperty];
                    // setting properties in the `set` functions causes trouble, so it's more sensible for that
                    // to simply have no effect rather than make the entire element break, especially
                    // as the 'no effect' version can be useful (see paper-datatable-card.html demo)
                    var dataClone = JSON.parse(JSON.stringify(data));

                    if (path.length > 0) {
                        value = dataClone[property];
                        var setPromise = this.dataSource.set(dataClone, property, value);
                    } else {
                        var setPromise = this.dataSource.set(dataClone, property, value);
                    }

                    this._datatable.set('progress', true);
                    setPromise.then(function (successOrId) {
                        if (typeof successOrId === 'boolean') {
                            if (successOrId !== true) {
                                throw new Error('failure');
                            }
                        } else {
                            console.warn('re-implement')
                            //var index = this._datatable._getIndexById('__new__');
                            //this._datatable.set(['data', index, this._datatable.idProperty], successOrId);
                        }
                        this._datatable.set('progress', false);
                    }.bind(this), function (err) {
                        throw new Error('failure');
                        this._datatable.set('progress', false);
                    }.bind(this)).catch(function () {
                        console.warn('saving failed');
                        this._datatable.set('progress', false);
                    }.bind(this));
                }, 1000);
						}
        }
    },
    _handleSort: function(ev){
        if(this.dataSource) {
						ev.preventDefault();
						this.firstPage();
						this._sortProperty = ev.detail.sort.property;
						this._sortDirection = ev.detail.sort.direction;
        }
    },

    processItems: function(items){

        this._datatable.deselectAll(false);
        this._datatable.splice('data', 0, this._datatable.data.length);

        var args = ['data'].concat(items);
        this._datatable.push.apply(this._datatable, args);
        this._setSelectedKeysOnDatatable();
        this._datatable.set('progress', false);

        this._disableSave = false;

        this.async(function(){
						items.forEach(function(item){
                this._cache.set(item[this.idProperty], item);
						}.bind(this));
        });

    },
    /**
     * Call this function to trigger reloading of the current page
     */
    retrieveVisibleData: function(){
        var self = this;
        if (!this.dataSource) return;
        this.debounce("visibleData", function(){
						this._disableSave = true;

						var queryArgs = [{
                property: this._sortProperty,
                direction: this._sortDirection
						}, this.page, this.pageSize];

						this._datatable.set('progress', true);
						
						if('queryForIds' in this.dataSource){
                this.dataSource.queryForIds.apply(this.dataSource, queryArgs).then(function(ids){
                    var items = [];
                    var i = 0;
                    var done = function(){
                        i++;
                        if(i == 2){
                            var sortedItems = ids.map(function(id) {
                                return items.find(function(item) { return item[self.idProperty] == id});
                            });
                            this.processItems(sortedItems);
                        }
                    }.bind(this);

                    var idsInCache = ids.filter(function(id) { return self._cache.has(id)});
                    if(idsInCache.length){
                        var cacheItems = [];
                        idsInCache.forEach(function(id){
                            cacheItems.push(this._cache.get(id));
                        }.bind(this));
                        items = items.concat(cacheItems);
                        done();
                    }else{
                        done();
                    }

                    var idsNotInCache = ids.filter(function(id) {return !self._cache.has(id)});
                    if(idsNotInCache.length){
                        this.dataSource.getByIds(idsNotInCache).then(function(newItems){
                            items = items.concat(newItems);
                            done();
                        });
                    }else{
                        done();
                    }
                }.bind(this));

						}else{
                this.dataSource.get.apply(this.dataSource, queryArgs).then(function(items){
                    this.processItems(items);
                }.bind(this));
						}
        }, 0);

    },
    _getRangeStart: function(){
        return (this.page-1)*this.pageSize+1;						
    },
    _getRangeEnd: function(){
        return Math.min((this.page)*this.pageSize, this._numberOfItems);
    },
    /**
     * Navigate to the next page
     */
    nextPage: function(){
        this.set("page", this.page+1);
    },
    /**
     * Navigate to the previous page
     */
    prevPage: function(){
        this.set("page", this.page-1);
    },
    /**
     * Navigate to the first page
     */
    firstPage: function(){
        this.set("page", 1);
    },
    /**
     * Navigate to the last page
     */
    lastPage: function(){
        this.set("page", Math.ceil(this._numberOfItems / this.pageSize));
    },
    _prevPageDisabled: function(){
        return this.page == 1;
    },
    _nextPageDisabled: function(){
        return this.page * this.pageSize >= this._numberOfItems;
    },
    _setSelectedToolbarVisible: function(){
        this._selectedToolbarVisible = this.selectedIds.length > 0;
        this._singleSelectToolbarVisible = this.selectedIds.length == 1;
        this._multiSelectToolbarVisible = this.selectedIds.length > 1;
        this._numberOfSelectedIds = this.selectedIds.length;
        this._datatable._partialSelection = this.selectedIds.length > 0;
    },
    _setSelectedIds: function(ev){
        if(ev.detail.selected){
						if(!this._datatable.multiSelection){
                this.splice('selectedIds', 0, 1);
						}
						ev.detail.selected.forEach(function(key){
                var id = this._datatable._getByKey(key)[this.idProperty];
                if(this.selectedIds.indexOf(id) == -1){
                    this.push('selectedIds', id);
                }
						}.bind(this));
        }
        if(ev.detail.deselected){
						ev.detail.deselected.forEach(function(key){
                var id = this._datatable._getByKey(key)[this.idProperty];
                if(this.selectedIds.indexOf(id) > -1){
                    this.splice('selectedIds', this.selectedIds.indexOf(id), 1);
                }
						}.bind(this));
        }
    },
    _setSelectedKeysOnDatatable: function(){
        this._datatable.data.forEach(function(item){
						var id = item[this.idProperty];
						if(this.selectedIds.indexOf(id) > -1){
                this._datatable.select(item, false);
						}
        }.bind(this));
    },
    _setNumberOfItems: function(){
        this.set('_numberOfItems', this.dataSource.length);
    },
    _toggleAll: function(ev){
        if(this.dataSource && 'queryForIds' in this.dataSource){
						if(this.selectedIds.length === this.dataSource.length){
                this.deselectAll();
						}else{
                this.deselectAll();
                this._datatable.set('progress', true);
                this.dataSource.queryForIds(undefined, 1, this.dataSource.length).then(function(ids){
                    this._datatable.set('progress', undefined);
                    this.push.apply(this, ['selectedIds'].concat(ids));
                    this._setSelectedKeysOnDatatable();
                    this._setSelectedToolbarVisible();
                }.bind(this));
						}
						ev.preventDefault();
        }
    },
    /**
     * Deselect all items
     */
    deselectAll: function(){
        this._datatable.deselectAll(false);
        this.splice('selectedIds', 0, this.selectedIds.length);
        this._setSelectedToolbarVisible();
    },
    /**
     * Select the item with the specified id
     * @param id
     */
    select: function(id){
        this.push('selectedIds', id);
        this._setSelectedKeysOnDatatable();
        this._setSelectedToolbarVisible();
    }

});
