/*
 * Copyright (c) 2016 Charles University in Prague, Faculty of Arts,
 *                    Institute of the Czech National Corpus
 * Copyright (c) 2016 Tomas Machalek <tomas.machalek@gmail.com>
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

import * as React from 'vendor/react';
import {init as saveViewInit} from './save';
import {init as basicOverviewInit} from './basicOverview';

/*
Important note regarding variable naming conventions:

opKey (operationKey): a hash representing stored query args or string '__new__' when appending
                         a new operation
opId (operationId): a general manatee operation type identifier (e.g. 's' - sample, 'q' - query)

opIdx (operationIdx): an index of an operation within query pipeline (starting from zero).

In general, client knows by default opId and opIdx when a page is loaded. Operation key 'opKey'
may or may not be available without additional AJAX request.
*/


export function init(dispatcher, he, layoutViews, viewDeps, queryReplayStore, mainMenuStore, querySaveAsStore) {

    const saveViews = saveViewInit(dispatcher, he, layoutViews, querySaveAsStore);
    const basicOverviewViews = basicOverviewInit(dispatcher, he);


    const formTypeToTitle = (opFormType) => {
        switch (opFormType) {
            case 'query':
                return he.translate('query__operation_name_query');
            case 'filter':
                return he.translate('query__operation_name_filter');
            case 'sort':
                return he.translate('query__operation_name_sort');
            case 'sample':
                return he.translate('query__operation_name_sample');
            case 'shuffle':
                return he.translate('query__operation_name_shuffle');
            case 'switchmc':
                return he.translate('query__operation_name_switchmc');
            case 'subhits':
                return he.translate('query__operation_name_subhits');
            case 'firsthits':
                return he.translate('query__operation_name_firsthits');
            default:
                return null;
        }
    };


    // ------------------------ <QueryReplayView /> --------------------------------

    const QueryReplayView = (props) => {

        return (
            <layoutViews.ModalOverlay onCloseKey={()=>undefined}>
                <layoutViews.PopupBox customClass="query-replay-box" onCloseClick={()=>undefined}>
                    <div>
                        <h3>{he.translate('query__replay_replaying_query')}{'\u2026'}</h3>
                        <img src={he.createStaticUrl('img/ajax-loader-bar.gif')}
                                alt={he.translate('global__loading_icon')} />
                        <div />
                    </div>
                </layoutViews.PopupBox>
            </layoutViews.ModalOverlay>
        );
    };

    // ------------------------ <ExecutionOptions /> --------------------------------

    const ExecutionOptions = (props) => {

        const handleRadioInputChange = (evt) => {
            dispatcher.dispatch({
                actionType: 'QUERY_SET_STOP_AFTER_IDX',
                props: {
                    operationIdx: props.operationIdx,
                    value: evt.target.value === 'continue' ? null : props.operationIdx
                }
            });
        };

        return (
            <fieldset className="query-exec-opts">
                <legend>
                    {he.translate('query__execution_opts_fieldset')}
                </legend>
                <ul>
                    <li>
                        <label className={props.modeRunFullQuery ? 'active' : null}>
                            <input type="radio" name="exec-opts" style={{verticalAlign: 'middle'}} value="continue"
                                    checked={props.modeRunFullQuery}
                                    onChange={handleRadioInputChange} />
                            {he.translate('query__behaviour_apply_and_continue')}
                        </label>
                    </li>
                    <li>
                        <label className={!props.modeRunFullQuery ? 'active' : null}>
                            <input type="radio" name="exec-opts" style={{verticalAlign: 'middle'}} value="stop"
                                    checked={!props.modeRunFullQuery}
                                    onChange={handleRadioInputChange} />
                            {he.translate('query__behaviour_apply_and_stop')}
                        </label>
                    </li>
                </ul>
            </fieldset>
        );
    };

    // ------------------------ <QueryEditor /> --------------------------------

    const QueryEditor = (props) => {
        const renderEditorComponent = () => {
            if (props.isLoading) {
                return <img src={he.createStaticUrl('img/ajax-loader-bar.gif')} alt={he.translate('global__loading')} />;

            } else if (!props.opKey || props.editIsLocked) {
                return (
                    <div>
                        <p>
                            <img src={he.createStaticUrl('img/warning-icon.svg')}
                                alt={he.translate('global__warning_icon')}
                                 style={{verticalAlign: 'middle', marginRight: '0.5em'}} />
                            {he.translate('query__replay_op_cannot_be_edited_msg')}.
                        </p>
                        <div style={{textAlign: 'center', marginTop: '2em'}}>
                            <a className="default-button" href={he.createActionLink(`view?${props.opEncodedArgs}`)}>
                                {he.translate('query__replay_view_the_result')}
                            </a>
                        </div>
                    </div>
                );

            } else if (props.operationIdx === 0) {
                return <viewDeps.QueryFormView {...props.editorProps} operationIdx={props.operationIdx} />;

            } else if (props.operationFormType === 'filter') {
                return <viewDeps.FilterFormView {...props.editorProps}
                            operationIdx={props.operationIdx}
                            filterId={props.opKey} />;

            } else if (props.operationFormType === 'sort') {
                return <viewDeps.SortFormView sortId={props.opKey} operationIdx={props.operationIdx} />;

            } else if (props.operationFormType === 'sample') {
                return <viewDeps.SampleForm sampleId={props.opKey} operationIdx={props.operationIdx} />;

            } else if (props.operationFormType === 'shuffle') {
                return <viewDeps.ShuffleForm {...props.editorProps} shuffleId={props.opKey}
                            shuffleMinResultWarning={props.shuffleMinResultWarning}
                            lastOpSize={props.resultSize}
                            operationIdx={props.operationIdx} />;

            } else if (props.operationFormType === 'switchmc') {
                return <viewDeps.SwitchMainCorpForm {...props.editorProps}
                                operationIdx={props.operationIdx}
                                opKey={props.opKey} />;

            } else if (props.operationFormType === 'subhits') {
                return <viewDeps.SubHitsForm {...props.editorProps}
                                operationIdx={props.operationIdx}
                                opKey={props.opKey} />;

            } else if (props.operationFormType === 'firsthits') {
                return <viewDeps.FirstHitsForm {...props.editorProps}
                                operationIdx={props.operationIdx}
                                opKey={props.opKey} />;

            } else {
                return <div>???</div>;
            }
        };

        return (
            <layoutViews.ModalOverlay onCloseKey={props.closeClickHandler}>
                <layoutViews.CloseableFrame
                        customClass="query-form-spa"
                        label={he.translate('query__edit_current_hd_{operation}',
                                {operation: formTypeToTitle(props.operationFormType)})}
                        onCloseClick={props.closeClickHandler}>
                    {props.operationIdx < props.numOps - 1 ?
                        <ExecutionOptions modeRunFullQuery={props.modeRunFullQuery}
                                operationIdx={props.operationIdx} />
                        : null
                    }
                    {renderEditorComponent()}
                </layoutViews.CloseableFrame>
            </layoutViews.ModalOverlay>
        );
    };

    // ------------------------ <QueryOpInfo /> --------------------------------

    const QueryOpInfo = (props) => {

        const renderLabel = () => {
            if (props.idx === 0) {
                return [
                    '\u00a0|\u00a0',
                    <strong key="op">{props.item.op}</strong>
                ];

            } else {
                return [
                    <span key="transit" className="transition">{'\u00A0\u25B6\u00A0'}</span>,
                    <strong key="op">{props.item.op}</strong>
                ];
            }
        };

        return (
            <li>
                {renderLabel()}{':\u00a0'}
                {props.item.nicearg ?
                    (<a className="args" onClick={props.clickHandler} title={he.translate('query__click_to_edit_the_op')}>
                        {props.item.nicearg}
                    </a>)
                    : (<a className="args" onClick={props.clickHandler} title={he.translate('query__click_to_edit_the_op')}>
                        {'\u2713'}</a>)
                    }
                {props.item.size ?
                        '\u00a0(' + he.translate('query__overview_hits_{num_hits}',
                        {num_hits: props.item.size}) + ')'
                    : null}
                {props.hasOpenEditor ?
                    <QueryEditor
                        editorProps={props.editorProps}
                        closeClickHandler={props.closeEditorHandler}
                        operationIdx={props.idx}
                        operationId={props.item.opid}
                        operationFormType={props.item.formType}
                        opKey={props.editOpKey}
                        opEncodedArgs={props.item.tourl}
                        isLoading={props.isLoading}
                        modeRunFullQuery={props.modeRunFullQuery}
                        numOps={props.numOps}
                        shuffleMinResultWarning={props.shuffleMinResultWarning}
                        resultSize={props.item.size}
                        editIsLocked={props.editIsLocked} />
                    : null}
            </li>
        );
    };


    // ------------------------ <QueryOverview /> --------------------------------

    class QueryOverview extends React.Component {

        constructor(props) {
            super(props);
            this._handleEditClick = this._handleEditClick.bind(this);
            this._handleEditorClose = this._handleEditorClose.bind(this);
            this._storeChangeListener = this._storeChangeListener.bind(this);
            this.state = {
                replayIsRunning: queryReplayStore.getBranchReplayIsRunning(),
                ops: queryReplayStore.getCurrEncodedOperations(),
                editOpIdx: null,
                editOpKey: null,
                isLoading: false,
                queryOverview: queryReplayStore.getCurrentQueryOverview(),
                modeRunFullQuery: queryReplayStore.getRunFullQuery(),
                editIsLocked: queryReplayStore.editIsLocked()
            };
        }

        _handleEditClick(idx) {
            dispatcher.dispatch({
                actionType: 'EDIT_QUERY_OPERATION',
                props: {operationIdx: idx}
            });
        }

        _handleEditorClose() {
            this.setState({
                replayIsRunning: queryReplayStore.getBranchReplayIsRunning(),
                ops: queryReplayStore.getCurrEncodedOperations(),
                editOpIdx: null,
                editOpKey: null,
                isLoading: false,
                queryOverview: null,
                modeRunFullQuery: queryReplayStore.getRunFullQuery(),
                editIsLocked: queryReplayStore.editIsLocked()
            });
        }

        _storeChangeListener(store, action) {
            this.setState({
                replayIsRunning: queryReplayStore.getBranchReplayIsRunning(),
                ops: queryReplayStore.getCurrEncodedOperations(),
                editOpIdx: queryReplayStore.getEditedOperationIdx(),
                editOpKey: queryReplayStore.opIdxToCachedQueryKey(this.state.editOpIdx),
                isLoading: false,
                queryOverview: queryReplayStore.getCurrentQueryOverview(),
                modeRunFullQuery: queryReplayStore.getRunFullQuery(),
                editIsLocked: queryReplayStore.editIsLocked()
            });
        }

        componentDidMount() {
            queryReplayStore.addChangeListener(this._storeChangeListener);
        }

        componentWillUnmount() {
            queryReplayStore.removeChangeListener(this._storeChangeListener);
        }

        _getEditorProps(opIdx, opId) {
            if (['a', 'q'].indexOf(opId) > -1) {
                return this.props.queryFormProps;

            } else if (['p', 'P', 'n', 'N'].indexOf(opId) > -1) {
                return this.props.filterFormProps;

            } else if (opId === 'f') {
                return {
                    shuffleSubmitFn: () => {
                        dispatcher.dispatch({
                            actionType: 'BRANCH_QUERY',
                            props: {
                                operationIdx: opIdx
                            }
                        });
                    }
                }

            } else if (opId === 'D') {
                return {
                    submitFn: () => {
                        dispatcher.dispatch({
                            actionType: 'BRANCH_QUERY',
                            props: {
                                operationIdx: opIdx
                            }
                        });
                    }
                }

            } else if (opId === 'F') {
                return this.props.filterFirstDocHitsFormProps;

            } else if (opId === 'x') {
                return this.props.switchMcFormProps;

            } else {
                return {};
            }
        }

        render() {
            return (
                <div>
                    {this.state.queryOverview ?
                            <basicOverviewViews.QueryOverivewTable data={this.state.queryOverview} onEditClick={this._handleEditClick} />
                            : null}
                    {this.state.replayIsRunning ? <QueryReplayView /> : null}

                    <ul id="query-overview-bar">
                        {this.props.humanCorpname ?
                                <layoutViews.CorpnameInfoTrigger
                                        corpname={this.props.corpname}
                                        humanCorpname={this.props.humanCorpname}
                                        usesubcorp={this.props.usesubcorp} />
                                : null}
                        {this.state.ops.map((item, i) => {
                            return <QueryOpInfo
                                        key={`op_${i}`}
                                        idx={i}
                                        editOpKey={this.state.editOpKey}
                                        item={item}
                                        clickHandler={this._handleEditClick.bind(this, i)}
                                        hasOpenEditor={this.state.editOpIdx === i && !this.state.replayIsRunning}
                                        editorProps={this.state.editOpIdx === i ? this._getEditorProps(i, item.opid) : null}
                                        closeEditorHandler={this._handleEditorClose}
                                        isLoading={this.state.isLoading}
                                        modeRunFullQuery={this.state.modeRunFullQuery}
                                        numOps={this.state.ops.size}
                                        shuffleMinResultWarning={this.props.shuffleFormProps.shuffleMinResultWarning}
                                        editIsLocked={this.state.editIsLocked} />;
                        })}
                    </ul>
                </div>
            );
        }
    }


    // ------------------------ <RedirectingQueryOverview /> -------------------------------

    const RedirectingQueryOverview = (props) => {

        const handleEditClickFn = (opIdx) => {
            return () => {
                dispatcher.dispatch({
                    actionType: 'REDIRECT_TO_EDIT_QUERY_OPERATION',
                    props: {
                        operationIdx: opIdx
                    }
                });
            };
        };

        return (
            <ul id="query-overview-bar">
                    {props.humanCorpname ?
                            <layoutViews.CorpnameInfoTrigger
                                    corpname={props.corpname}
                                    humanCorpname={props.humanCorpname}
                                    usesubcorp={props.usesubcorp} />
                            : null}
                    {props.ops.map((item, i) => {
                        return <QueryOpInfo
                                    key={`op_${i}`}
                                    idx={i}
                                    item={item}
                                    clickHandler={handleEditClickFn(i)}
                                    hasOpenEditor={false}
                                    editorProps={null}
                                    closeEditorHandler={()=>undefined}
                                    isLoading={false}
                                    modeRunFullQuery={false}
                                    numOps={props.ops.size}
                                    shuffleMinResultWarning=""
                                    editIsLocked={true} />;
                    })}
            </ul>
        );
    }


    // ------------------------ <AppendOperationOverlay /> --------------------------------

    /**
     * A component wrapping a new operation form to be
     * added to the query chain.
     */
    const AppendOperationOverlay = (props) => {
        const handleCloseClick = () => {
            dispatcher.dispatch({
                actionType: 'MAIN_MENU_CLEAR_ACTIVE_ITEM',
                props: {}
            });
        };

        const createActionBasedForm = () => {
            switch (props.menuActiveItem.actionName) {
                case 'MAIN_MENU_SHOW_FILTER':
                    return <viewDeps.FilterFormView {...props.filterFormProps} filterId="__new__" />;
                case 'MAIN_MENU_SHOW_SORT':
                    return <viewDeps.SortFormView sortId="__new__" />;
                case 'MAIN_MENU_SHOW_SAMPLE':
                    return <viewDeps.SampleForm sampleId="__new__" />;
                case 'MAIN_MENU_APPLY_SHUFFLE':
                    return <viewDeps.ShuffleForm {...props.shuffleFormProps}
                                lastOpSize={props.lastOpSize} sampleId="__new__" />;
                case 'MAIN_MENU_FILTER_APPLY_SUBHITS_REMOVE':
                    return <viewDeps.SubHitsForm {...props.filterSubHitsFormProps}
                                    opKey="__new__" />;
                case 'MAIN_MENU_FILTER_APPLY_FIRST_OCCURRENCES':
                    return <viewDeps.FirstHitsForm {...props.filterFirstDocHitsFormProps}
                                    opKey="__new__" />;
                case 'MAIN_MENU_SHOW_SWITCHMC':
                    return <viewDeps.SwitchMainCorpForm {...props.switchMcFormProps}
                                lastOpSize={props.lastOpSize} sampleId="__new__" />;
                default:
                    return <div>??</div>;
            }
        };

        const createTitle = () => {
            const m = {
                MAIN_MENU_SHOW_FILTER: 'filter',
                MAIN_MENU_SHOW_SORT: 'sort',
                MAIN_MENU_SHOW_SAMPLE: 'sample',
                MAIN_MENU_APPLY_SHUFFLE: 'shuffle',
                MAIN_MENU_SHOW_SWITCHMC: 'switchmc',
                MAIN_MENU_FILTER_APPLY_SUBHITS_REMOVE: 'subhits',
                MAIN_MENU_FILTER_APPLY_FIRST_OCCURRENCES: 'firsthits'
            };
            const ident = formTypeToTitle(m[props.menuActiveItem.actionName]);
            return he.translate('query__add_an_operation_title_{opname}', {opname: ident});
        };

        return (
            <layoutViews.ModalOverlay onCloseKey={handleCloseClick}>
                <layoutViews.CloseableFrame
                        customClass="query-form-spa"
                        onCloseClick={handleCloseClick}
                        label={createTitle()}>
                    {createActionBasedForm()}
                </layoutViews.CloseableFrame>
            </layoutViews.ModalOverlay>
        );
    };


    // ------------------------ <QueryToolbar /> --------------------------------

    class QueryToolbar extends React.Component {

        constructor(props) {
            super(props);
            this._mainMenuStoreChangeListener = this._mainMenuStoreChangeListener.bind(this);
            this.state = this._fetchStoreState();
        }

        _fetchStoreState() {
            return {
                activeItem: mainMenuStore.getActiveItem(),
                lastOpSize: queryReplayStore.getCurrEncodedOperations().size > 0 ?
                        queryReplayStore.getCurrEncodedOperations().get(-1).size : 0
            };
        }

        _mainMenuStoreChangeListener() {
            this.setState(this._fetchStoreState());
        }

        componentDidMount() {
            mainMenuStore.addChangeListener(this._mainMenuStoreChangeListener);
        }

        componentWillUnmount() {
            mainMenuStore.removeChangeListener(this._mainMenuStoreChangeListener);
        }

        _renderOperationForm() {
            const actions = [
                'MAIN_MENU_SHOW_SORT',
                'MAIN_MENU_APPLY_SHUFFLE',
                'MAIN_MENU_SHOW_SAMPLE',
                'MAIN_MENU_SHOW_FILTER',
                'MAIN_MENU_FILTER_APPLY_SUBHITS_REMOVE',
                'MAIN_MENU_FILTER_APPLY_FIRST_OCCURRENCES'
            ];
            if (this.state.activeItem !== null && actions.indexOf(this.state.activeItem.actionName) > -1) {
                return <AppendOperationOverlay {...this.props} menuActiveItem={this.state.activeItem}
                            lastOpSize={this.state.lastOpSize} />

            } else {
                return null;
            }
        }

        _renderSaveForm() {
            if (this.state.activeItem && this.state.activeItem.actionName === 'MAIN_MENU_SHOW_SAVE_QUERY_AS_FORM') {
                return <saveViews.QuerySaveAsForm />;
            }
        }

        render() {
            return (
                <div>
                    <QueryOverview {...this.props} />
                    {this._renderOperationForm()}
                    {this._renderSaveForm()}
                </div>
            );
        }
    }


    // ------------------------ <NonViewPageQueryToolbar /> --------------------------------

    class NonViewPageQueryToolbar extends React.Component {

        constructor(props) {
            super(props);
            this.state = this._fetchStoreState();
            this._handleStoreChange = this._handleStoreChange.bind(this);
        }

        _fetchStoreState() {
            return {
                ops: queryReplayStore.getCurrEncodedOperations(),
                queryOverview: queryReplayStore.getCurrentQueryOverview()
            };
        }

        _handleStoreChange() {
            this.setState(this._fetchStoreState());
        }

        componentDidMount() {
            queryReplayStore.addChangeListener(this._handleStoreChange);
        }

        componentWillUnmount() {
            queryReplayStore.removeChangeListener(this._handleStoreChange);
        }

        render() {
            return (
                <div>
                    <RedirectingQueryOverview {...this.props} ops={this.state.ops} />
                    {this.state.queryOverview ?
                        <basicOverviewViews.QueryOverivewTable data={this.state.queryOverview}
                                onEditClick={this._handleEditClick} /> :
                    null}
                </div>
            );
        }
    };


    return {
        QueryToolbar: QueryToolbar,
        NonViewPageQueryToolbar: NonViewPageQueryToolbar
    };
}