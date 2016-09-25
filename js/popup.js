window.FRPopup = (function (window, $) {
    'use strict';
    var self;


    function FRPopup(config) {
        self = this;
        self.config = $.extend(self.defaults, config);
        self.popup = $.magnificPopup.instance;

        self.init();
    }


    FRPopup.prototype = {

        defaults: {
            selector: '.fr-popup-anchor'
        },


        init: function () {
            // Clear previous events if any
            if (self.$popupEls) {
                self.$popupEls.off('click', self._onPopupElClick);
            }
            self.$popupEls = $(self.config.selector);
            self._attachPopup();

            window.onpopstate = self._showPopupFromURL;
            self._showPopupFromURL();
        },


        destroy: function () {
            self.$popupEls.off('click', self._onPopupElClick);
            self.popup.close();
        },


        _attachPopup: function () {
            self.$popupEls.on('click', self._onPopupElClick);
        },


        _recalculateSwiperSlideshow: function ($el) {
            var slideshows = $el.find('.swiper-container');

            if ($el.get(0).classList.contains('swiper-container')) {
                slideshows = slideshows.addBack($el);
            }

            slideshows.each(function() {
                var swiper = window.swiperSlideshows && window.swiperSlideshows[this.id];
                if (swiper) {
                    swiper.resizeFix();
                }
            });
        },


        _onPopupElClick: function (event) {
            event.preventDefault();
            self._showPopup(event.currentTarget);
        },


        _showPopup: function (el, index) {
            var href = el.getAttribute('href'),
                isDisplayingImage = false,
                isGallery = false,
                target,
                items;

            self.showThumbs = false;
            self.closingFromURL = false;

            // If target is gallery widget then show images popup
            if (el.classList.contains('fr-popup-gallery')) {
                isGallery = true;
                items = [];

                if (el.hasAttribute('data-gallery-show-thumbs')) {
                    self.showThumbs = true;
                }

                try {
                    items = JSON.parse(el.dataset.galleryImages);
                    items = items.map(function (item) {
                        return {
                            type: 'image',
                            src: item.src,
                            title: item.title
                        };
                    });
                }
                catch (e) {
                    return;
                }

                $(el).find('.fr-popup-gallery-images-container img').each(function () {
                    items.push({
                        type: 'image',
                        src: this.src,
                        title: this.title
                    });
                });
            }

            else if (href) {
                target = $(href);
                if (!target) { return; }

                items = {type: 'inline', src: target};

                // If target is image widget then show image popup
                if (target.hasClass('fr-img')) {
                    var img = target.find('img').first();

                    if (img) {
                        isDisplayingImage = true;
                        items = {type: 'image', src: img.attr('src')};
                    }
                }

                // If target widget is container and has no children find background image and show it in popup
                else if (target.hasClass('fr-container')) {
                    var childWidgets = target.find('.fr-widget');
                    if (!childWidgets.length) {
                        var backgroundImage = target.css('background-image').match(/url\(['"]?([^'"]+)['"]?\)/);

                        if (backgroundImage) {
                            isDisplayingImage = true;
                            items = {type: 'image', src: backgroundImage[1]};
                        }
                    }
                }
            }

            if (!items || isGallery && !items.length) { return; }

            self.popup.open({
                items: items,
                removalDelay: 300,
                mainClass: self.showThumbs ? 'mfp-gallery-with-thumbs' : '',
                index: index,

                gallery: {
                    enabled: isGallery
                },

                callbacks: {
                    beforeOpen: function () {
                        self._attachThumbnails();
                    },

                    open: function () {
                        if (!isDisplayingImage && !isGallery) {
                            target.show();
                        }

                        if (target) {
                            // Recalculate Swiper slideshows when open in popup
                            self._recalculateSwiperSlideshow(target);
                        }
                    },

                    change: function (item) {
                        self._setActiveThumb(item.index);

                        if (!self.openingFromURL) {
                            var urlPart = isGallery ? item.index + 1 :  href.substr(1);
                            self._pushUrl('#' + el.id + '/' + urlPart);
                        }
                        // Set to false until next _showPopup call
                        self.openingFromURL = false;
                    },

                    afterClose: function () {
                        if (target) {
                            target.removeClass('mfp-hide').css('display', '');

                            // Recalculate Swiper slideshows when returned to DOM
                            self._recalculateSwiperSlideshow(target);
                        }

                        if (!self.closingFromURL) {
                            self._pushUrl('#' + el.id);
                        }
                        self.closingFromURL = false;
                    }
                }
            });
        },


        _showPopupFromURL: function () {
            var hash, fragments, el, index;

            hash = document.location.hash;
            fragments = hash && decodeURI(hash).split(/\//g);

            if (!fragments || fragments.length < 2) {
                return self._closePopupFromURL();
            }

            // Get element
            if (fragments[0].indexOf('#') === 0) {
                el = $(fragments[0] + ':visible');

                if (el.length) {
                    window.scrollTo(0, el.offset().top);
                    el = el.get(0);
                }
                else {
                    return self._closePopupFromURL();
                }
            }

            // Get gallery index
            if (!isNaN(fragments[1])) {
                index = parseInt(fragments[1]) - 1;
            }

            self.openingFromURL = true;
            self._showPopup(el, index);
        },


        _closePopupFromURL: function () {
            self.closingFromURL = true;
            return self.popup.close();
        },


        _attachThumbnails: function() {
            if (!self.showThumbs) {
                return;
            }

            var mp = $.magnificPopup.instance;
            var html = '';

            html += '<div class="mfp-thumbs-wrap"> <ul class="mfp-thumbs mfp-prevent-close" data-thumbs-count="' + mp.items.length + '"">';

            mp.items.forEach(function (item, index) {
                html += '<li onclick="javascript:$.magnificPopup.instance.goTo(' + index + ');return false;"';
                html += ' style="background-image: url(' + item.src + ')" class="mfp-prevent-close';
                if (item.index === mp.index) {
                    html += ' active';
                }
                html += '" data-index="' + index + '"> </li>';
            });
            html += '</ul> </div>';

            mp.thumbs = $(html);
            mp.container.append(mp.thumbs);
        },


        _setActiveThumb: function (index) {
            if (!self.showThumbs) {
                return;
            }

            var mp = $.magnificPopup.instance;
            mp.thumbs.find('li').removeClass('active');
            mp.thumbs.find('[data-index="' + index + '"]').addClass('active');
        },


        _pushUrl: function (url) {
            if (history && history.pushState) {
                history.pushState(null, null, url);
            }
        }
    };

    return FRPopup;

})(window, $);
