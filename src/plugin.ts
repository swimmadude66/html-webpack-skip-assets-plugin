import * as HtmlWebpackPlugin from 'html-webpack-plugin';
import * as minimatch from 'minimatch';

type AssetMatchFunction = (asset: HtmlWebpackPlugin.HtmlTagObject) => boolean;

export type AssetMatcher = (
    string
    | RegExp
    | AssetMatchFunction
);

export interface SkipAssetsConfig {
    /**
     * skipAssets {string | RegExp} - backwards compatible option
     */
    skipAssets?: (AssetMatcher)[];
    /**
     * excludeAssets {string | RegExp} - backwards compatible option
     */
    excludeAssets?: (AssetMatcher)[]; // for backwards compatibility
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

    private _skipAssets(assets: HtmlWebpackPlugin.HtmlTagObject[], matchers: AssetMatcher[]): any[]  {
        return assets.filter(a => {
            const skipped = matchers.some(matcher => {
                if (!matcher) {
                    return false;
                }
                const assetUrl: string = (a.attributes.src || a.attributes.href) as string;
                if (typeof matcher === 'string') {
                    return minimatch(assetUrl, matcher);
                }
                if (matcher.constructor && matcher.constructor.name === 'RegExp') {
                    const regexMatcher = (matcher as RegExp);
                    return !!(assetUrl.match(regexMatcher));
                }
                if (typeof matcher === 'function') {
                    const matchesCallback = matcher(a);
                    return !!(matchesCallback);
                }
                return false;
            });
            return !skipped;
        });
    }
}
