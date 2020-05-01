import * as HtmlWebpackPlugin from 'html-webpack-plugin';
import * as minimatch from 'minimatch';

export interface SkipAssetsConfig {
    /**
     * skipAssets {string | RegExp} - backwards compatible option
     */
    skipAssets?: (string | RegExp)[];
    /**
     * excludeAssets {string | RegExp} - backwards compatible option
     */
    excludeAssets?: (string | RegExp)[]; // for backwards compatibility
    // in case I want to add other optional configs later without breaking old uses
}

const PLUGIN_NAME = 'HtmlSkipAssetsPlugin';

export class HtmlWebpackSkipAssetsPlugin {

    constructor(
        private _config: SkipAssetsConfig = {skipAssets: [], excludeAssets: []}
    ) {
    }

    apply(compiler) {
        if (compiler.hooks) {
            // webpack 4 support
            compiler.hooks.compilation.tap(PLUGIN_NAME, (compilation) => {
                if (compilation.hooks.htmlWebpackPluginAlterAssetTags) {
                    // html webpack 3
                    compilation.hooks.htmlWebpackPluginAlterAssetTags.tapAsync(
                        PLUGIN_NAME,
                        (data, cb) => {
                            const filters = [
                                ...(this._config.skipAssets || []),
                                ...(this._config.excludeAssets || []),
                                ...(data.plugin.options.skipAssets || []),
                                ...(data.plugin.options.excludeAssets || []),
                            ];
                            data.head = this._skipAssets(data.head, filters);
                            data.body = this._skipAssets(data.body, filters);
                            return cb(null, data);
                        }
                    )
                } else if (HtmlWebpackPlugin && HtmlWebpackPlugin.getHooks) {
                    // html-webpack 4
                    const hooks = HtmlWebpackPlugin.getHooks(compilation);
                    hooks.alterAssetTags.tapAsync(
                        PLUGIN_NAME,
                        (data, cb) => {
                            const filters = [
                                ...(this._config.skipAssets || []),
                                ...(this._config.excludeAssets || []),
                                ...(data.plugin['options'].skipAssets || []),
                                ...(data.plugin['options'].excludeAssets || []),
                            ];
                            data.assetTags.scripts = this._skipAssets(data.assetTags.scripts, filters);
                            data.assetTags.styles = this._skipAssets(data.assetTags.styles, filters);
                            data.assetTags.meta = this._skipAssets(data.assetTags.meta, filters);
                            return cb(null, data);
                        }
                    )
                } else {
                    throw new Error('Cannot find appropriate compilation hook');
                }
            });
        } else {
            // Hook into the html-webpack-plugin processing
            compiler.plugin('compilation', (compilation) => {
                compilation.plugin('html-webpack-plugin-alter-asset-tags', (htmlPluginData, callback) => {
                    const filters = [
                        ...(this._config.skipAssets || []),
                        ...(this._config.excludeAssets || []),
                        ...(htmlPluginData.plugin.options.skipAssets || []),
                        ...(htmlPluginData.plugin.options.excludeAssets || []),
                    ];
                    htmlPluginData.head = this._skipAssets(htmlPluginData.head, filters);
                    htmlPluginData.body = this._skipAssets(htmlPluginData.body, filters);
                    return callback(null, htmlPluginData);
                });
            });
        }
    }

    private _skipAssets(assets: any[], filters: (string|RegExp)[]): any[]  {
        return assets.filter(a => {
            const skipped = filters.some(pattern => {
                if (!pattern) {
                    return false;
                }
                const asset = a.attributes.src || a.attributes.href;
                if (typeof pattern === 'string') {
                    return minimatch(asset, pattern);
                }
                if (pattern.constructor && pattern.constructor.name === 'RegExp') {
                    return (pattern as RegExp).test(asset);
                }
                return false;
            });
            return !skipped;
        });
    }
}