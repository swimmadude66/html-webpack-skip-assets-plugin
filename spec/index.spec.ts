import {join} from 'path';
import {readFileSync} from 'fs';
import {expect} from 'chai';
import * as webpack from 'webpack';
import * as HtmlWebpackPlugin from 'html-webpack-plugin';
import * as MiniCssExtractPlugin  from 'mini-css-extract-plugin';
import * as rimraf from 'rimraf';
import {HtmlWebpackSkipAssetsPlugin} from '../src/plugin';

const OUTPUT_DIR = join(__dirname, './test_dist');

const HtmlWebpackPluginOptions = {
    filename: 'index.html',
    hash: false,
    inject: 'body' as 'body',
    minify: {
        collapseWhitespace: true,
        removeComments: true,
        removeRedundantAttributes: true,
        useShortDoctype: true,

    },
    showErrors: true,
    template: join(__dirname, './test_data/index.html'),
};

const webpackDevOptions: webpack.Configuration = {
    mode: 'development',
    entry: {
        app: join(__dirname, './test_data/entry.js'),
        polyfill: join(__dirname, './test_data/polyfill.js'),
        styles: join(__dirname, './test_data/styles.css')
    },
    output: {
        path: OUTPUT_DIR
    },
    module: {
        rules: [
            {
                test: /\.css$/,
                use: [{
                    loader: MiniCssExtractPlugin.loader
                },{
                    loader: 'css-loader'
                }]
            }
        ]
    },
    plugins: [
        new MiniCssExtractPlugin({
            filename: '[name].css'
        })
    ]
};

const webpackProdOptions: webpack.Configuration = {
    ...webpackDevOptions,
    output: {
        filename: '[name].[contenthash].min.js',
        path: OUTPUT_DIR,
        pathinfo: true
    },
    mode: 'production',
    plugins: [
        new MiniCssExtractPlugin({
            filename: '[name].[contenthash].min.css'
        })
    ]
};

function getOutput(): string {
    const htmlFile = join(OUTPUT_DIR, './index.html');
    const htmlContents = readFileSync(htmlFile).toString('utf8');
    expect(!!htmlContents).to.be.true;
    return htmlContents;
}

console.log('\nWEBPACK VERSION', webpack.version,'\n');
console.log('\nHTML-WEBPACK_PLUGIN VERSION', HtmlWebpackPlugin.version,'\n');

const configs = [
    {
        name: 'Development',
        options: webpackDevOptions
    },
    {
        name: 'Production',
        options: webpackProdOptions
    },
];

configs.forEach(c => {
    // have to use `function` instead of arrow so we can see `this`
    describe(`HtmlWebpackSkipAssetsPlugin ${c.name} Mode`, function () {
        // set timeout to 5s because webpack is slow
        this.timeout(5000);

        afterEach((done) => {
            rimraf(OUTPUT_DIR, done);
        });

        it('should do nothing when no patterns are specified', (done) => {
            webpack({ ...c.options,
                plugins: [
                    ...c.options.plugins,
                    new HtmlWebpackPlugin(HtmlWebpackPluginOptions),
                    new HtmlWebpackSkipAssetsPlugin(),
                ]
            }, (err) => {
                expect(!!err).to.be.false;
                const html = getOutput();
                expect(/script\s+.*?src\s*=\s*"(\/)?polyfill(\.[a-z0-9]+\.min)?\.js"/i.test(html), 'could not find polyfill bundle').to.be.true;
                expect(/script\s+.*?src\s*=\s*"(\/)?app(\.[a-z0-9]+\.min)?\.js"/i.test(html), 'could not find app bundle').to.be.true;
                expect(/script\s+.*?src\s*=\s*"(\/)?styles(\.[a-z0-9]+\.min)?\.js"/i.test(html), 'could not find styles js bundle').to.be.true;
                expect(/link\s+.*?href\s*=\s*"(\/)?styles(\.[a-z0-9]+\.min)?\.css"/i.test(html), 'could not find styles css bundle').to.be.true;
                done();
            });
        });

        it('should skip adding asset if the pattern matches - plugin.skipAssets.minimatch', (done) => {
            webpack({ ...c.options,
                plugins: [
                    ...c.options.plugins,
                    new HtmlWebpackPlugin(HtmlWebpackPluginOptions),
                    new HtmlWebpackSkipAssetsPlugin({
                        skipAssets: ['styles**.js']
                    }),
                ]
            }, (err) => {
                expect(!!err).to.be.false;
                const html = getOutput();
                expect(/script\s+.*?src\s*=\s*"(\/)?polyfill(\.[a-z0-9]+\.min)?\.js"/i.test(html), 'could not find polyfill bundle').to.be.true;
                expect(/script\s+.*?src\s*=\s*"(\/)?app(\.[a-z0-9]+\.min)?\.js"/i.test(html), 'could not find app bundle').to.be.true;
                expect(/script\s+.*?src\s*=\s*"(\/)?styles(\.[a-z0-9]+\.min)?\.js"/i.test(html), 'did not skip styles js bundle').to.be.false;
                expect(/link\s+.*?href\s*=\s*"(\/)?styles(\.[a-z0-9]+\.min)?\.css"/i.test(html), 'could not find styles css bundle').to.be.true;
                done();
            });
        });

        it('should skip adding asset if the pattern matches - plugin.excludeAssets.minimatch', (done) => {
            webpack({ ...c.options,
                plugins: [
                    ...c.options.plugins,
                    new HtmlWebpackPlugin(HtmlWebpackPluginOptions),
                    new HtmlWebpackSkipAssetsPlugin({
                        excludeAssets: ['styles**.js']
                    }),
                ]
            }, (err) => {
                expect(!!err).to.be.false;
                const html = getOutput();
                expect(/script\s+.*?src\s*=\s*"(\/)?polyfill(\.[a-z0-9]+\.min)?\.js"/i.test(html), 'could not find polyfill bundle').to.be.true;
                expect(/script\s+.*?src\s*=\s*"(\/)?app(\.[a-z0-9]+\.min)?\.js"/i.test(html), 'could not find app bundle').to.be.true;
                expect(/script\s+.*?src\s*=\s*"(\/)?styles(\.[a-z0-9]+\.min)?\.js"/i.test(html), 'did not skip styles js bundle').to.be.false;
                expect(/link\s+.*?href\s*=\s*"(\/)?styles(\.[a-z0-9]+\.min)?\.css"/i.test(html), 'could not find styles css bundle').to.be.true;
                done();
            });
        });

        it('should skip adding asset if the pattern matches - plugin.skipAssets.regex', (done) => {
            webpack({ ...c.options,
                plugins: [
                    ...c.options.plugins,
                    new HtmlWebpackPlugin(HtmlWebpackPluginOptions),
                    new HtmlWebpackSkipAssetsPlugin({
                        skipAssets: [/styles\..*js/i]
                    }),
                ]
            }, (err) => {
                expect(!!err).to.be.false;
                const html = getOutput();
                expect(/script\s+.*?src\s*=\s*"(\/)?polyfill(\.[a-z0-9]+\.min)?\.js"/i.test(html), 'could not find polyfill bundle').to.be.true;
                expect(/script\s+.*?src\s*=\s*"(\/)?app(\.[a-z0-9]+\.min)?\.js"/i.test(html), 'could not find app bundle').to.be.true;
                expect(/script\s+.*?src\s*=\s*"(\/)?styles(\.[a-z0-9]+\.min)?\.js"/i.test(html), 'did not skip styles js bundle').to.be.false;
                expect(/link\s+.*?href\s*=\s*"(\/)?styles(\.[a-z0-9]+\.min)?\.css"/i.test(html), 'could not find styles css bundle').to.be.true;
                done();
            });
        });

        it('should skip adding asset if the pattern matches - plugin.excludeAssets.regex', (done) => {
            webpack({ ...c.options,
                plugins: [
                    ...c.options.plugins,
                    new HtmlWebpackPlugin(HtmlWebpackPluginOptions),
                    new HtmlWebpackSkipAssetsPlugin({
                        excludeAssets: [/styles\..*js/i]
                    }),
                ]
            }, (err) => {
                expect(!!err).to.be.false;
                const html = getOutput();
                expect(/script\s+.*?src\s*=\s*"(\/)?polyfill(\.[a-z0-9]+\.min)?\.js"/i.test(html), 'could not find polyfill bundle').to.be.true;
                expect(/script\s+.*?src\s*=\s*"(\/)?app(\.[a-z0-9]+\.min)?\.js"/i.test(html), 'could not find app bundle').to.be.true;
                expect(/script\s+.*?src\s*=\s*"(\/)?styles(\.[a-z0-9]+\.min)?\.js"/i.test(html), 'did not skip styles js bundle').to.be.false;
                expect(/link\s+.*?href\s*=\s*"(\/)?styles(\.[a-z0-9]+\.min)?\.css"/i.test(html), 'could not find styles css bundle').to.be.true;
                done();
            });
        });

        it('should skip adding asset if the pattern matches - plugin.skipAssets.regex-global', (done) => {
            webpack({ ...c.options,
                plugins: [
                    ...c.options.plugins,
                    new HtmlWebpackPlugin(HtmlWebpackPluginOptions),
                    new HtmlWebpackSkipAssetsPlugin({
                        skipAssets: [/styles\./gi]
                    }),
                ]
            }, (err) => {
                expect(!!err).to.be.false;
                const html = getOutput();
                expect(/script\s+.*?src\s*=\s*"(\/)?polyfill(\.[a-z0-9]+\.min)?\.js"/i.test(html), 'could not find polyfill bundle').to.be.true;
                expect(/script\s+.*?src\s*=\s*"(\/)?app(\.[a-z0-9]+\.min)?\.js"/i.test(html), 'could not find app bundle').to.be.true;
                expect(/script\s+.*?src\s*=\s*"(\/)?styles(\.[a-z0-9]+\.min)?\.js"/i.test(html), 'did not skip styles js bundle').to.be.false;
                expect(/link\s+.*?href\s*=\s*"(\/)?styles(\.[a-z0-9]+\.min)?\.css"/i.test(html), 'did not skip styles css bundle').to.be.false;
                done();
            });
        });

        it('should skip adding asset if the pattern matches - plugin.excludeAssets.regex-global', (done) => {
            webpack({ ...c.options,
                plugins: [
                    ...c.options.plugins,
                    new HtmlWebpackPlugin(HtmlWebpackPluginOptions),
                    new HtmlWebpackSkipAssetsPlugin({
                        excludeAssets: [/styles\./gi]
                    }),
                ]
            }, (err) => {
                expect(!!err).to.be.false;
                const html = getOutput();
                expect(/script\s+.*?src\s*=\s*"(\/)?polyfill(\.[a-z0-9]+\.min)?\.js"/i.test(html), 'could not find polyfill bundle').to.be.true;
                expect(/script\s+.*?src\s*=\s*"(\/)?app(\.[a-z0-9]+\.min)?\.js"/i.test(html), 'could not find app bundle').to.be.true;
                expect(/script\s+.*?src\s*=\s*"(\/)?styles(\.[a-z0-9]+\.min)?\.js"/i.test(html), 'did not skip styles js bundle').to.be.false;
                expect(/link\s+.*?href\s*=\s*"(\/)?styles(\.[a-z0-9]+\.min)?\.css"/i.test(html), 'did not skip styles css bundle').to.be.false;
                done();
            });
        });

        it('should skip adding asset if the pattern matches - plugin.skipAssets.callback', (done) => {
            webpack({ ...c.options,
                plugins: [
                    ...c.options.plugins,
                    new HtmlWebpackPlugin(HtmlWebpackPluginOptions),
                    new HtmlWebpackSkipAssetsPlugin({
                        skipAssets: [(asset) => {
                            const attributes = (asset && asset.attributes) || {};
                            const src = (attributes.src || attributes.href) as string;
                            return /styles\..*js/i.test(src);
                        }]
                    }),
                ]
            }, (err) => {
                expect(!!err).to.be.false;
                const html = getOutput();
                expect(/script\s+.*?src\s*=\s*"(\/)?polyfill(\.[a-z0-9]+\.min)?\.js"/i.test(html), 'could not find polyfill bundle').to.be.true;
                expect(/script\s+.*?src\s*=\s*"(\/)?app(\.[a-z0-9]+\.min)?\.js"/i.test(html), 'could not find app bundle').to.be.true;
                expect(/script\s+.*?src\s*=\s*"(\/)?styles(\.[a-z0-9]+\.min)?\.js"/i.test(html), 'did not skip styles js bundle').to.be.false;
                expect(/link\s+.*?href\s*=\s*"(\/)?styles(\.[a-z0-9]+\.min)?\.css"/i.test(html), 'could not find styles css bundle').to.be.true;
                done();
            });
        });

        it('should skip adding asset if the pattern matches - plugin.excludeAssets.callback', (done) => {
            webpack({ ...c.options,
                plugins: [
                    ...c.options.plugins,
                    new HtmlWebpackPlugin(HtmlWebpackPluginOptions),
                    new HtmlWebpackSkipAssetsPlugin({
                        excludeAssets: [(asset) => {
                            const attributes = (asset && asset.attributes) || {};
                            const src = (attributes.src || attributes.href) as string;
                            return /styles\..*js/i.test(src);
                        }]
                    }),
                ]
            }, (err) => {
                expect(!!err).to.be.false;
                const html = getOutput();
                expect(/script\s+.*?src\s*=\s*"(\/)?polyfill(\.[a-z0-9]+\.min)?\.js"/i.test(html), 'could not find polyfill bundle').to.be.true;
                expect(/script\s+.*?src\s*=\s*"(\/)?app(\.[a-z0-9]+\.min)?\.js"/i.test(html), 'could not find app bundle').to.be.true;
                expect(/script\s+.*?src\s*=\s*"(\/)?styles(\.[a-z0-9]+\.min)?\.js"/i.test(html), 'did not skip styles js bundle').to.be.false;
                expect(/link\s+.*?href\s*=\s*"(\/)?styles(\.[a-z0-9]+\.min)?\.css"/i.test(html), 'could not find styles css bundle').to.be.true;
                done();
            });
        });

        it('should skip adding asset if the pattern matches - parent.skipAssets.minimatch', (done) => {
            webpack({ ...c.options,
                plugins: [
                    ...c.options.plugins,
                    new HtmlWebpackPlugin({
                        ...HtmlWebpackPluginOptions,
                        skipAssets: ['styles**.js']
                    }),
                    new HtmlWebpackSkipAssetsPlugin(),
                ]
            }, (err) => {
                expect(!!err).to.be.false;
                const html = getOutput();
                expect(/script\s+.*?src\s*=\s*"(\/)?polyfill(\.[a-z0-9]+\.min)?\.js"/i.test(html), 'could not find polyfill bundle').to.be.true;
                expect(/script\s+.*?src\s*=\s*"(\/)?app(\.[a-z0-9]+\.min)?\.js"/i.test(html), 'could not find app bundle').to.be.true;
                expect(/script\s+.*?src\s*=\s*"(\/)?styles(\.[a-z0-9]+\.min)?\.js"/i.test(html), 'did not skip styles js bundle').to.be.false;
                expect(/link\s+.*?href\s*=\s*"(\/)?styles(\.[a-z0-9]+\.min)?\.css"/i.test(html), 'could not find styles css bundle').to.be.true;
                done();
            });
        });

        it('should skip adding asset if the pattern matches - parent.excludeAssets.minimatch', (done) => {
            webpack({ ...c.options,
                plugins: [
                    ...c.options.plugins,
                    new HtmlWebpackPlugin({
                        ...HtmlWebpackPluginOptions,
                        excludeAssets: ['styles**.js']
                    }),
                    new HtmlWebpackSkipAssetsPlugin(),
                ]
            }, (err) => {
                expect(!!err).to.be.false;
                const html = getOutput();
                expect(/script\s+.*?src\s*=\s*"(\/)?polyfill(\.[a-z0-9]+\.min)?\.js"/i.test(html), 'could not find polyfill bundle').to.be.true;
                expect(/script\s+.*?src\s*=\s*"(\/)?app(\.[a-z0-9]+\.min)?\.js"/i.test(html), 'could not find app bundle').to.be.true;
                expect(/script\s+.*?src\s*=\s*"(\/)?styles(\.[a-z0-9]+\.min)?\.js"/i.test(html), 'did not skip styles js bundle').to.be.false;
                expect(/link\s+.*?href\s*=\s*"(\/)?styles(\.[a-z0-9]+\.min)?\.css"/i.test(html), 'could not find styles css bundle').to.be.true;
                done();
            });
        });

        it('should skip adding asset if the pattern matches - parent.skipAssets.regex', (done) => {
            webpack({ ...c.options,
                plugins: [
                    ...c.options.plugins,
                    new HtmlWebpackPlugin({
                        ...HtmlWebpackPluginOptions,
                        skipAssets: [/styles\..*js/i]
                    }),
                    new HtmlWebpackSkipAssetsPlugin(),
                ]
            }, (err) => {
                expect(!!err).to.be.false;
                const html = getOutput();
                expect(/script\s+.*?src\s*=\s*"(\/)?polyfill(\.[a-z0-9]+\.min)?\.js"/i.test(html), 'could not find polyfill bundle').to.be.true;
                expect(/script\s+.*?src\s*=\s*"(\/)?app(\.[a-z0-9]+\.min)?\.js"/i.test(html), 'could not find app bundle').to.be.true;
                expect(/script\s+.*?src\s*=\s*"(\/)?styles(\.[a-z0-9]+\.min)?\.js"/i.test(html), 'did not skip styles js bundle').to.be.false;
                expect(/link\s+.*?href\s*=\s*"(\/)?styles(\.[a-z0-9]+\.min)?\.css"/i.test(html), 'could not find styles css bundle').to.be.true;
                done();
            });
        });

        it('should skip adding asset if the pattern matches - parent.excludeAssets.regex', (done) => {
            webpack({ ...c.options,
                plugins: [
                    ...c.options.plugins,
                    new HtmlWebpackPlugin({
                        ...HtmlWebpackPluginOptions,
                        excludeAssets: [/styles\..*js/i]
                    }),
                    new HtmlWebpackSkipAssetsPlugin(),
                ]
            }, (err) => {
                expect(!!err).to.be.false;
                const html = getOutput();
                expect(/script\s+.*?src\s*=\s*"(\/)?polyfill(\.[a-z0-9]+\.min)?\.js"/i.test(html), 'could not find polyfill bundle').to.be.true;
                expect(/script\s+.*?src\s*=\s*"(\/)?app(\.[a-z0-9]+\.min)?\.js"/i.test(html), 'could not find app bundle').to.be.true;
                expect(/script\s+.*?src\s*=\s*"(\/)?styles(\.[a-z0-9]+\.min)?\.js"/i.test(html), 'did not skip styles js bundle').to.be.false;
                expect(/link\s+.*?href\s*=\s*"(\/)?styles(\.[a-z0-9]+\.min)?\.css"/i.test(html), 'could not find styles css bundle').to.be.true;
                done();
            });
        });

        it('should skip adding asset if the pattern matches - parent.skipAssets.regex-global', (done) => {
            webpack({ ...c.options,
                plugins: [
                    ...c.options.plugins,
                    new HtmlWebpackPlugin({
                        ...HtmlWebpackPluginOptions,
                        skipAssets: [/styles\./gi]
                    }),
                    new HtmlWebpackSkipAssetsPlugin(),
                ]
            }, (err) => {
                expect(!!err).to.be.false;
                const html = getOutput();
                expect(/script\s+.*?src\s*=\s*"(\/)?polyfill(\.[a-z0-9]+\.min)?\.js"/i.test(html), 'could not find polyfill bundle').to.be.true;
                expect(/script\s+.*?src\s*=\s*"(\/)?app(\.[a-z0-9]+\.min)?\.js"/i.test(html), 'could not find app bundle').to.be.true;
                expect(/script\s+.*?src\s*=\s*"(\/)?styles(\.[a-z0-9]+\.min)?\.js"/i.test(html), 'did not skip styles js bundle').to.be.false;
                expect(/link\s+.*?href\s*=\s*"(\/)?styles(\.[a-z0-9]+\.min)?\.css"/i.test(html), 'did not skip styles css bundle').to.be.false;
                done();
            });
        });

        it('should skip adding asset if the pattern matches - parent.excludeAssets.regex-global', (done) => {
            webpack({ ...c.options,
                plugins: [
                    ...c.options.plugins,
                    new HtmlWebpackPlugin({
                        ...HtmlWebpackPluginOptions,
                        excludeAssets: [/styles\./gi]
                    }),
                    new HtmlWebpackSkipAssetsPlugin(),
                ]
            }, (err) => {
                expect(!!err).to.be.false;
                const html = getOutput();
                expect(/script\s+.*?src\s*=\s*"(\/)?polyfill(\.[a-z0-9]+\.min)?\.js"/i.test(html), 'could not find polyfill bundle').to.be.true;
                expect(/script\s+.*?src\s*=\s*"(\/)?app(\.[a-z0-9]+\.min)?\.js"/i.test(html), 'could not find app bundle').to.be.true;
                expect(/script\s+.*?src\s*=\s*"(\/)?styles(\.[a-z0-9]+\.min)?\.js"/i.test(html), 'did not skip styles js bundle').to.be.false;
                expect(/link\s+.*?href\s*=\s*"(\/)?styles(\.[a-z0-9]+\.min)?\.css"/i.test(html), 'did not skip styles css bundle').to.be.false;
                done();
            });
        });

        it('should skip adding asset if the pattern matches - parent.skipAssets.callback', (done) => {
            webpack({ ...c.options,
                plugins: [
                    ...c.options.plugins,
                    new HtmlWebpackPlugin({
                        ...HtmlWebpackPluginOptions,
                        skipAssets: [(asset) => {
                            const attributes = (asset && asset.attributes) || {};
                            const src = (attributes.src || attributes.href) as string;
                            return /styles\..*js/i.test(src);
                        }]
                    }),
                    new HtmlWebpackSkipAssetsPlugin(),
                ]
            }, (err) => {
                expect(!!err).to.be.false;
                const html = getOutput();
                expect(/script\s+.*?src\s*=\s*"(\/)?polyfill(\.[a-z0-9]+\.min)?\.js"/i.test(html), 'could not find polyfill bundle').to.be.true;
                expect(/script\s+.*?src\s*=\s*"(\/)?app(\.[a-z0-9]+\.min)?\.js"/i.test(html), 'could not find app bundle').to.be.true;
                expect(/script\s+.*?src\s*=\s*"(\/)?styles(\.[a-z0-9]+\.min)?\.js"/i.test(html), 'did not skip styles js bundle').to.be.false;
                expect(/link\s+.*?href\s*=\s*"(\/)?styles(\.[a-z0-9]+\.min)?\.css"/i.test(html), 'could not find styles css bundle').to.be.true;
                done();
            });
        });

        it('should skip adding asset if the pattern matches - parent.excludeAssets.callback', (done) => {
            webpack({ ...c.options,
                plugins: [
                    ...c.options.plugins,
                    new HtmlWebpackPlugin({
                        ...HtmlWebpackPluginOptions,
                        excludeAssets: [(asset) => {
                            const attributes = (asset && asset.attributes) || {};
                            const src = (attributes.src || attributes.href) as string;
                            return /styles\..*js/i.test(src);
                        }]
                    }),
                    new HtmlWebpackSkipAssetsPlugin(),
                ]
            }, (err) => {
                expect(!!err).to.be.false;
                const html = getOutput();
                expect(/script\s+.*?src\s*=\s*"(\/)?polyfill(\.[a-z0-9]+\.min)?\.js"/i.test(html), 'could not find polyfill bundle').to.be.true;
                expect(/script\s+.*?src\s*=\s*"(\/)?app(\.[a-z0-9]+\.min)?\.js"/i.test(html), 'could not find app bundle').to.be.true;
                expect(/script\s+.*?src\s*=\s*"(\/)?styles(\.[a-z0-9]+\.min)?\.js"/i.test(html), 'did not skip styles js bundle').to.be.false;
                expect(/link\s+.*?href\s*=\s*"(\/)?styles(\.[a-z0-9]+\.min)?\.css"/i.test(html), 'could not find styles css bundle').to.be.true;
                done();
            });
        });
    });
});
