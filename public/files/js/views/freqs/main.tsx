/*
 * Copyright (c) 2017 Charles University in Prague, Faculty of Arts,
 *                    Institute of the Czech National Corpus
 * Copyright (c) 2017 Tomas Machalek <tomas.machalek@gmail.com>
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU General Public License
 * as published by the Free Software Foundation; version 2
 * dated June, 1991.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.

 * You should have received a copy of the GNU General Public License
 * along with this program; if not, write to the Free Software
 * Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
 */

/// <reference path="../../vendor.d.ts/react.d.ts" />
/// <reference path="../../types/common.d.ts" />

import * as React from 'vendor/react';
import {init as dataRowsInit} from './dataRows';
import {init as initSaveViews} from './save';
import {FreqDataRowsStore, ResultBlock} from '../../stores/freqs/dataRows';

// --------------------------- exported types --------------------------------------

interface FreqResultViewProps {
}

interface FreqResultViewState {
    blocks:Immutable.List<ResultBlock>;
    minFreqVal:string;
    currentPage:string;
    sortColumn:string;
    hasNextPage:boolean;
    hasPrevPage:boolean;
    saveFormIsActive:boolean;
    isLoading:boolean;
}

interface ExportedComponents {
    FreqResultView:React.ComponentClass<FreqResultViewProps, FreqResultViewState>;
}

// ------------------------ factory --------------------------------

export function init(
        dispatcher:Kontext.FluxDispatcher,
        he:Kontext.ComponentHelpers,
        freqDataRowsStore:FreqDataRowsStore) {

    const drViews = dataRowsInit(dispatcher, he, freqDataRowsStore);
    const saveViews = initSaveViews(dispatcher, he, freqDataRowsStore.getSaveStore());
    const layoutViews = he.getLayoutViews();

    // ----------------------- <ResultSizeInfo /> -------------------------

    interface ResultSizeInfoProps {
        totalPages:number;
        totalItems:number;
    }

    const ResultSizeInfo:React.FuncComponent<ResultSizeInfoProps> = (props) => {

        return (
            <p>
                <strong>{he.translate('freq__avail_label')}:</strong>
                {'\u00a0'}
                {he.translate('freq__avail_items_{num_items}', {num_items: props.totalItems})}
                {'\u00a0'}
                {props.totalPages ?
                    <span>({he.translate('freq__avail_pages_{num_pages}', {num_pages: props.totalPages})})</span>
                    : null}
            </p>
        );
    };

    // ----------------------- <Paginator /> -------------------------

    interface PaginatorProps {
        isLoading:boolean;
        currentPage:number;
        hasNextPage:boolean;
        hasPrevPage:boolean;
        current:number; // TODO !!!
        setLoadingFlag:()=>void;
    }

    const Paginator:React.FuncComponent<PaginatorProps> = (props) => {

        const handlePageChangeByClick = (curr, step) => {
            props.setLoadingFlag();
            dispatcher.dispatch({
                actionType: 'FREQ_RESULT_SET_CURRENT_PAGE',
                props: {value: String(Number(curr) + step)}
            });
        };

        const handlePageChange = (evt) => {
            props.setLoadingFlag();
            dispatcher.dispatch({
                actionType: 'FREQ_RESULT_SET_CURRENT_PAGE',
                props: {value: evt.target.value}
            });
        };

        const renderPageNum = () => {
            if (props.isLoading) {
                return (
                    <span className="input-like" style={{width: '3em'}}>
                        <img src={he.createStaticUrl('img/ajax-loader-bar.gif')}
                            alt={he.translate('global__loading')} />
                    </span>
                );

            } else {
                return <input type="text" value={props.currentPage}
                                    title={he.translate('global__curr_page_num')}
                                    onChange={handlePageChange}
                                    disabled={!props.hasPrevPage && !props.hasNextPage}
                                    style={{width: '3em'}} />;
            }
        };

        return (
            <div className="bonito-pagination">
                <form>
                    <div className="bonito-pagination-core">
                        <div className="bonito-pagination-left">
                            {props.hasPrevPage ?
                                (<a onClick={(e) => handlePageChangeByClick(props.currentPage, -1)}>
                                    <img className="over-img" src={he.createStaticUrl('img/prev-page.svg')}
                                            alt="další" title="další" />
                                </a>) : null}
                        </div>
                        {renderPageNum()}
                        <div className="bonito-pagination-right">
                            {props.current}
                            {props.hasNextPage ?
                                (<a onClick={(e) => handlePageChangeByClick(props.currentPage, 1)}>
                                    <img className="over-img" src={he.createStaticUrl('img/next-page.svg')}
                                            alt="další" title="další" />
                                </a>) : null}
                        </div>
                    </div>
                </form>
            </div>
        );
    };

    // ----------------------- <FilterForm /> -------------------------

    interface FilterFormProps {
        minFreqVal:string;
        setLoadingFlag:()=>void;
    }

    const FilterForm:React.FuncComponent<FilterFormProps> = (props) => {

        const handleInputChange = (evt) => {
            dispatcher.dispatch({
                actionType: 'FREQ_RESULT_SET_MIN_FREQ_VAL',
                props: {value: evt.target.value}
            });
        };

        const handleApplyClick = (evt) => {
            props.setLoadingFlag();
            dispatcher.dispatch({
                actionType: 'FREQ_RESULT_APPLY_MIN_FREQ',
                props: {}
            });
        };

        const inputKeyDownHandler = (evt:KeyboardEvent) => {
            if (evt.keyCode === 13) {
                props.setLoadingFlag();
                dispatcher.dispatch({
                    actionType: 'FREQ_RESULT_APPLY_MIN_FREQ',
                    props: {}
                });
                evt.preventDefault();
                evt.stopPropagation();
            }
        };

        return (
            <form action="freqs">
                <label>
                    {he.translate('freq__limit_input_label')}:
                    {'\u00a0'}
                    <input type="text" name="flimit" value={props.minFreqVal}
                            style={{width: '3em'}}
                            onChange={handleInputChange}
                            onKeyDown={inputKeyDownHandler} />
                </label>
                {'\u00a0'}
                <button type="button" className="util-button" onClick={handleApplyClick}>
                    {he.translate('global__apply_btn')}
                </button>
            </form>
        );
    };

    // ----------------------- <FreqResultView /> -------------------------

    class FreqResultView extends React.Component<FreqResultViewProps, FreqResultViewState> {

        constructor(props) {
            super(props);
            this._handleStoreChange = this._handleStoreChange.bind(this);
            this._setLoadingFlag = this._setLoadingFlag.bind(this);
            this.state = this._fetchState();
        }

        _fetchState() {
            return {
                blocks: freqDataRowsStore.getBlocks(),
                minFreqVal: freqDataRowsStore.getMinFreq(),
                currentPage: freqDataRowsStore.getCurrentPage(),
                sortColumn: freqDataRowsStore.getSortColumn(),
                hasNextPage: freqDataRowsStore.hasNextPage(),
                hasPrevPage: freqDataRowsStore.hasPrevPage(),
                saveFormIsActive: freqDataRowsStore.getSaveStore().getFormIsActive(),
                isLoading: false
            };
        }

        _handleStoreChange(evt) {
            this.setState(this._fetchState());
        }

        componentDidMount() {
            freqDataRowsStore.addChangeListener(this._handleStoreChange);
            freqDataRowsStore.getSaveStore().addChangeListener(this._handleStoreChange);
        }

        componentWillUnmount() {
            freqDataRowsStore.removeChangeListener(this._handleStoreChange);
            freqDataRowsStore.getSaveStore().removeChangeListener(this._handleStoreChange);
        }

        _setLoadingFlag() {
            const v = this._fetchState();
            v.isLoading = true;
            this.setState(v);
        }

        _handleSaveFormClose() {
            dispatcher.dispatch({
                actionType: 'FREQ_RESULT_CLOSE_SAVE_FORM',
                props: {}
            });
        }

        render() {
            return (
                <div>
                    {this.state.currentPage !== null ?
                        <Paginator currentPage={this.state.currentPage}
                            hasNextPage={this.state.hasNextPage} hasPrevPage={this.state.hasPrevPage}
                            setLoadingFlag={this._setLoadingFlag}
                            isLoading={this.state.isLoading} /> : null}
                    <div className="freq-blocks">
                        <FilterForm minFreqVal={this.state.minFreqVal} setLoadingFlag={this._setLoadingFlag} />
                        {this.state.blocks.map((block, i) => {
                            return (
                                <div key={`block-${i}`}>
                                    <hr />
                                    <ResultSizeInfo totalPages={block.TotalPages} totalItems={block.Total} />
                                    <drViews.DataTable head={block.Head}
                                            sortColumn={this.state.sortColumn}
                                            rows={block.Items}
                                            setLoadingFlag={this._setLoadingFlag} />
                                </div>
                            );
                        })}
                    </div>
                    {this.state.saveFormIsActive ?
                        <saveViews.SaveFreqForm onClose={this._handleSaveFormClose} /> :
                        null
                    }
                </div>
            );
        }
    }


    return {
        FreqResultView: FreqResultView
    };
}