
const fields = require('./lib/fields.js');
const eventEmitter  = require('../../../events').emitter;
const extraFields =  require('../../../config/extraFields.js').fields;
const openstadMap = require('../../../config/map').default;
const styleSchema = require('../../../config/styleSchema.js').default;


module.exports = {
  //extend: 'apostrophe-widgets',
  extend: 'map-widgets',
  label: 'Resource representation',
  addFields: fields,

  construct: function(self, options) {

      const superPushAssets = self.pushAssets;
      self.pushAssets = function () {
        superPushAssets();
        self.pushAsset('stylesheet', 'main', { when: 'always' });
        self.pushAsset('stylesheet', 'secondary', { when: 'always' });
        self.pushAsset('script', 'main', { when: 'always' });
      };

      const superLoad = self.load;
      self.load = function (req, widgets, next) {
          const styles = openstadMap.defaults.styles;
          const globalData = req.data.global;
          const siteConfig = req.data.global.siteConfig;
          widgets.forEach((widget) => {
              // render string with variables. Add active recource
              if (widget.containerStyles) {
                const containerId = styleSchema.generateId();
                widget.containerId = containerId;
                widget.formattedContainerStyles = styleSchema.format(containerId, widget.containerStyles);
              }

              widget.siteConfig = {
                  minimumYesVotes: (siteConfig && siteConfig.ideas && siteConfig.ideas.minimumYesVotes),
                  voteValues: (siteConfig && siteConfig.votes && siteConfig.votes.voteValues) || [{
                      label: 'voor',
                      value: 'yes',
                      screenReaderAddition: 'dit plan stemmen'
                  }, {label: 'tegen', value: 'no', screenReaderAddition: 'dit plan stemmen'}],
              }
              if (widget.siteConfig.minimumYesVotes == null || typeof widget.siteConfig.minimumYesVotes == 'undefined') widget.siteConfig.minimumYesVotes = 100;

              const markerStyle = siteConfig.openStadMap && siteConfig.openStadMap.markerStyle ? siteConfig.openStadMap.markerStyle : null;

              // Todo: refactor this to get ideaId in a different way
              const ideaId = req.url
                  .replace(/(\/.*\/)/, '')
                  .replace(/\?.*/, '');

              const idea = req.data.ideas ? req.data.ideas.find(idea => idea.id === parseInt(ideaId, 10)) : null;
              const ideas = idea ? [idea] : [];

              widget.mapConfig = self.getMapConfigBuilder(globalData)
                  .setDefaultSettings({
                      mapCenterLat: (idea && idea.location && idea.location.coordinates && idea.location.coordinates[0]) || globalData.mapCenterLat,
                      mapCenterLng: (idea && idea.location && idea.location.coordinates && idea.location.coordinates[1]) || globalData.mapCenterLng,
                      mapZoomLevel: 16,
                      zoomControl: true,
                      disableDefaultUI : true,
                      styles: styles
                  })
                  .setMarkersByIdeas(ideas)
                  .setMarkerStyle(markerStyle)
                  .setPolygon(req.data.global.mapPolygons || null)
                  .getConfig()

          });
          return superLoad(req, widgets, next);
      }

      const superOutput = self.output;
      self.output = function(widget, options) {
        console.log('widget.page', widget.page);

        return superOutput(widget, options);
      };
  }
};
