Array.prototype.remove = function(from, to) {
	var rest = this.slice((to || from) + 1 || this.length);
	this.length = from < 0 ? this.length + from : from;
	return this.push.apply(this, rest);
};

var utils = {
	generate_id: function(){
		var uniqid = Date.now() + (Math.floor((Math.random() * 9) + 1));
		return uniqid;
	}
}

var settings = {
	edit_mode: false
}

var flux = {
	site: {
		data: {
			items: []
		}
	},
	load_site: function(){
		//get site id
		$.get("/api/site", function(site){
			flux.site = site;
			flux.draw_site(flux.site);
		});
	},
	draw_site: function(site){
		console.log(site.data.items);
		site.data.items.forEach(function(item){
			flux.item_add(item);
		});
	},
	save_site: function(){

		flux.site.data.items.forEach(function(item, index){

			// get current position
			var pos = $('#'+item.id).position();
			flux.site.data.items[index].position = pos;

			// get current dimension
			var width = $('#'+item.id).width();
			var height = $('#'+item.id).height();
			flux.site.data.items[index].dimension = {width: width, height: height};
		});

		$.post("/api/site", {data: flux.site.data}, function(res){
			alert('saved');
		});
	},
	make_editable: function(el){
		if(settings.edit_mode){
			el.addClass('editable').draggable().resizable();
		}
	},
	item_add: function(item){

		var el = '';
		var is_new = false;

		// if just placed, give default properties
		if(!item.id){
			is_new = true;
			item.id = 'item-'+utils.generate_id();
			item.position = {left: '300', top: '300'};
			item.dimension = {width: '100', height: '100'};

			// @todo re-do logic for stickables and page settings
			if(item.type != 'background'){
				item.stickable = true;
			}

			// save new item to flux local data
			flux.site.data.items.push(item);
		}

		// if item exists and has position
		if(item && item.dimension){

			// create element depending on type
			switch(item.type){
				case "image":
					el = $("<div id='"+item.id+"' class='item image'><img src='"+item.src+"'></div>");
					break;
				case "text":
					el = $("<div id='"+item.id+"' class='item text'><span>"+item.text+"</span></div>");
					el.css(item.attributes);
					break;
				case "video":
					el = $("<div id='"+item.id+"' class='item video'>"+item.src+"</div>");
					el.find('iframe').css({width: '90%', height: '90%'});
					break;
				case "background":
					$('body').css('background', 'url('+item.src+')  center center fixed');
					item.stickable = false;
					break;
			}

			if(item.stickable){

				// add new class to the element if new
				if(is_new) el.addClass('new');

				// set positions
				el.css('left', item.position.left + 'px');
				el.css('top', item.position.top + 'px');

				// set dimension
				el.css({width: item.dimension.width + 'px', height: item.dimension.height + 'px'});

				// draw to canvas
				$('#canvas').append(el);

				// enable editable functionalities (draggable, resizable) for the element
				flux.make_editable(el);

			}
		}

	},
	item_delete: function(item_id){

		// delete from canvas
		$('#'+item_id).parent().remove();

		// delete from flux local data
		flux.site.data.items.forEach(function(item, index){
			if(item.id == item_id){
				flux.site.data.items.remove(index);
			}
		});

	},
	events: {

		// for logged in site owner, enables the editable interface
		edit_mode: function(){

			$('.trig_edit_mode').on('click', function(e){
				var $el = $(this);

				// activate edit mode
				if(!settings.edit_mode){
					var pw = prompt('what is your password?');

					$.post('/auth', {pass:pw}, function(req){
						if(req){
							settings.edit_mode = true;
							$el.text('Logout');
							$('#tools').slideDown();

							$('.item').each(function(){
								console.log($(this).attr('id'));
								flux.make_editable($(this));
							});
						}else{
							alert('bad password');
						}
					});
				}else{ // de-activate edit mode
					settings.edit_mode = false;
					$el.text('Edit Mode');
					$('.editable').draggable('disable').resizable('disable').removeClass('editable');
					$('#tools').slideUp();
				}

			});

			// enable contextual (right-click popup)
			$.contextMenu({
				selector: '.editable',
				callback: function(key, opt) {
					var item_id = this.find('.item').attr('id');

					switch(key){
						case "delete":
							flux.item_delete(item_id);
							break;
					}
					return true;
				},
				items: {
					"edit": {name: "Edit", icon: "edit"},
					"delete": {name: "Delete", icon: "delete"},
				}
			});
		},

		// places element to canvas
		stick: function(){
			$('.trig_stick').on('click', function(e){
				var type = $(this).data('type');
				switch(type){
					case "image":
						var content = prompt('Enter an image url');
						if(!content) return false;
						var item = {
							type: 'image',
							src: content
						};
						break;
					case "text":
						var content = $('#tools-text-content').val();
						if(!content) return false;
						var attributes = {
							'font-family': $('#tools-text-font').val(),
							'color': '#'+$('#tools-text-color').val(),
							'font-size': $('#tools-text-size').val() + 'px'
						};
						var item = {
							type: 'text',
							text: content,
							attributes: attributes
						};
						break;
					case "background":
						var content = prompt('Enter a bg image url');
						if(!content) return false;
						var item = {
							type: 'background',
							src: content
						};
						break;
					case "video":
						var content = prompt('Enter a youtube video url');
						if(!content) return false;
						var item = {
							type: 'video',
							src: content
						};
						break;
				}
				flux.item_add(item);
			});

		},
		load_tools: function(){
			$('.trig_tool').on('click', function(e){
				var type = $(this).data('type');
				var id = '#tools-'+type;
				$(id).slideToggle();
			});


		},
		save_site: function(){
			$('.trig_save_page').on('click', function(){
				flux.save_site();
			});
		}
	},
	init: function(){
		flux.load_site();
		flux.events.save_site();
		flux.events.load_tools();
		flux.events.stick();
		flux.events.edit_mode();
	}
}

$(function() {
	flux.init();
});
