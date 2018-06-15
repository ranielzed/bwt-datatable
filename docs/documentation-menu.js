import '../../@polymer/paper-drawer-panel/paper-drawer-panel.js';
import '../../@polymer/iron-icon/iron-icon.js';
import '../../@polymer/iron-icons/iron-icons.js';
import '../../@polymer/paper-input/paper-input.js';
import '../../@polymer/paper-item/paper-item.js';
import '../../@polymer/paper-styles/paper-styles.js';
import '../../@polymer/paper-header-panel/paper-header-panel.js';
import '../../@polymer/paper-toolbar/paper-toolbar.js';
import { Polymer } from '../../@polymer/polymer/lib/legacy/polymer-fn.js';
import { dom } from '../../@polymer/polymer/lib/legacy/polymer.dom.js';
Polymer({
    is: 'demo-menu',
    properties: {
				currentUrl: {
            type: String,
            value: function(){
                return location.href.replace(this.resolveUrl('..'),'');// + (location.search.length ? '?' + location.search.replace('?','') : '');
            }
				},
				searchTerm: {
            type: String,
            value: '',
            observer: 'search'
				}
    },
    ready: function(){
				var items = dom(this.$.submenu).querySelectorAll('[data-keywords]').reduce(function(prev, cur){
            return prev.concat(JSON.parse(cur.dataset.keywords));
				}, []);
				this.allSubKeywords = JSON.stringify(items);
				this.title = document.title;
				document.title += ' - <paper-datatable>';

				var link = document.createElement('link');
				link.type = 'image/x-icon';
				link.rel = 'shortcut icon';
				link.href = this.resolveUrl('/images/icon.png');
				document.getElementsByTagName('head')[0].appendChild(link);
    },
    navigate: function(event, item){
				if(item.selected){
            location.href = this.resolveUrl('../'+item.selected);
				}
    },
    search: function(){

				this.$.noresults.setAttribute("hidden", true);

				var possibleResults = dom(this.root).querySelectorAll('[data-keywords]');

				var results = possibleResults.filter(function(possibleResult){
            var keywords = JSON.parse(possibleResult.dataset.keywords);
            return keywords.some(function(keyword){
                return keyword.indexOf(this.searchTerm) > -1;
            }.bind(this));
				}.bind(this));

				possibleResults.forEach(function(possibleResult){
            possibleResult.setAttribute('hidden', true);
            possibleResult.classList.remove('unindent');
				});

				results.forEach(function(result){
            result.removeAttribute('hidden');
            if(this.searchTerm.length > 0) {
                result.classList.add('unindent');
            }
				}.bind(this));

				this.$.submenu.opened = true;
				if(this.searchTerm.length > 0){
            if(results.length === 0){
                this.$.noresults.removeAttribute("hidden");
            }
				}else{
            //Polymer.dom(this.$.submenu).querySelector("paper-menu").selectedItem doesn't work due to asyncness issues :'(
            this.$.submenu.opened = dom(this.$.submenu).querySelectorAll('paper-menu paper-item').some(function(submenuItem){
                return submenuItem.dataset.url == this.currentUrl;
            }.bind(this));
				}

    }
});
