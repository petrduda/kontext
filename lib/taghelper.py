# -*- coding: utf-8 -*-
#
# Copyright (c) 2012 Czech National Corpus
#
# This program is free software; you can redistribute it and/or
# modify it under the terms of the GNU General Public License
# as published by the Free Software Foundation; version 2
# dated June, 1991.
#
# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU General Public License for more details.

# You should have received a copy of the GNU General Public License
# along with this program; if not, write to the Free Software
# Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.

import settings
import os
import re
import json
import logging
import locale
from lxml import etree

class TagGeneratorException(Exception):
    """
    General error for taghelper module
    """
    pass

def create_tag_variants_file_path(corpus_name):
    """
    Generates full path (full = as defined in the main configuration file)
    to the file listing all existing tag variants within for provided corpus name

    Parameters
    ----------
    corpus_name : str

    Returns
    -------
    path : str
    """
    if not corpus_name:
        raise TagGeneratorException('Empty corpus name')
    return '%s/%s' % (settings.get('corpora', 'tags_src_dir'), corpus_name)

def tag_variants_file_exists(corpus_name):
    """
    Tests whether the path to the provided corpus_name exists

    Parameters
    ----------
    corpus_name : str

    Returns
    -------
    answer : bool
    """
    return os.path.exists(create_tag_variants_file_path(corpus_name))


def load_tag_descriptions(path, lang):
    """
    """
    lang = lang.split('_')[0]
    xml = etree.parse(open(path))
    root = xml.find('corpora/tagsets')
    ans = [None for i in range(len(root))]
    for item in root:
        idx = int(item.attrib['position'])
        ans[idx] = {}
        for v in item:
            translations = {}
            for d in v:
                translations[d.attrib['lang']] = d.text
            if lang in translations:
                ans[idx][v.attrib['id']] = translations[lang]
            elif 'en' in translations:
                ans[idx][v.attrib['id']] = translations['en']
            else:
                ans[idx][v.attrib['id']] = '[%s]' % _('no description')
    return ans


class TagVariantLoader(object):
    """
    """

    spec_char_replacements = (
        ('-', r'.'),
        ('*', r'\*'),
        ('^', r'\^'),
        ('?', r'\?'),
        ('}', r'\}'),
        ('!', r'\!')
        )

    def __init__(self, corp_name, num_tag_pos):
        """
        """
        self.corp_name = corp_name
        self.num_tag_pos = num_tag_pos
        self.tags_file = open(create_tag_variants_file_path(corp_name))
        self.cache_dir = '%s/%s' % (settings.get('corpora', 'tags_cache_dir'), self.corp_name)

    def get_variant(self, selected_tags):
        """
        """
        return json.dumps(self.calculate_variant(selected_tags))

    def get_initial_values(self):
        """
        Loads all values as needed to initialize tag-builder widget.
        Values are cached forever into a JSON file.
        """
        path = '%s/initial-values.%s.json' % (self.cache_dir, locale.getlocale()[0])
        data = '[]'
        char_replac_tab = dict(self.__class__.spec_char_replacements)
        translation_table = load_tag_descriptions(settings.get('session', 'conf_path'), settings.get('session', 'lang'))

        if not os.path.exists(path):
            cache_path_items = os.path.dirname(path).split('/')
            if cache_path_items[0] == '':
                cache_path_items[0] = '/'
            else:
                cache_path_items.insert(0, './')
            tst_path = ''
            for s in cache_path_items:
                tst_path += '%s/' % s
                if not os.path.exists(tst_path):
                    os.mkdir(tst_path, 0775)
            ans = [set() for i in range(self.num_tag_pos)]
            for line in self.tags_file:
                line = line.strip() + (self.num_tag_pos - len(line.strip())) * '-'
                for i in range(self.num_tag_pos):
                    value = ''.join(map(lambda x : char_replac_tab[x] if x in char_replac_tab else x , line[i]))
                    if line[i] == '-':
                        ans[i].add(('-', ''))
                    elif i < len(translation_table) and line[i] in translation_table[i]:
                        ans[i].add((value, '%s - %s' % (line[i], translation_table[i][line[i]])))
                    else:
                        ans[i].add((value, line[i]))
                        logging.getLogger(__name__).warn('Tag value import - item %s at position %d not found in translation table' % (line[i], i))
            ans = [sorted(x, key=lambda item : item[1]) for x in ans]
            for i in range(len(ans)):
                if len(ans[i]) == 1:
                    ans[i] = ()
            data = json.dumps(ans)
            with open(path, 'w') as f:
                f.write(data)
                f.close()
        else:
            with open(path, 'r') as f:
                data = f.read()
                f.close()
        return data

    def calculate_variant(self, required_pattern):
        """
        Returns all tag variants in empty positions for a provided tag pattern.
        I.e. - if you enter 'A.B..' then all vectors 'v' with v[0] = A and v[2] = B
        will be returned.

        Parameters
        ----------
        required_pattern : str
                           tag pattern (regular expression)

        Returns
        -------
        variants : dict
                   a dictionary where keys represent tag-string position and values are lists of
                   tuples containing pairs 'ID, description'
        """
        translation_table = load_tag_descriptions(settings.get('session', 'conf_path'), settings.get('session', 'lang'))
        required_pattern = required_pattern.replace('-', '.')
        char_replac_tab = dict(self.__class__.spec_char_replacements)
        patt = re.compile(required_pattern)
        matching_tags = []
        for line in self.tags_file:
            line = line.strip() + (self.num_tag_pos - len(line.strip())) * '-'
            if patt.match(line):
                matching_tags.append(line)

        ans = {}
        for item in matching_tags:
            tag_elms = re.findall(r'\\[\*\?\^\.!]|\[[^\]]+\]|[^-]|-', required_pattern)
            for i in range(len(tag_elms)):
                value = ''.join(map(lambda x : char_replac_tab[x] if x in char_replac_tab else x , item[i]))
                if i not in ans:
                    ans[i] = set()
                if item[i] == '-':
                    ans[i].add(('-', ''))
                elif item[i] in translation_table[i]:
                    ans[i].add((value, '%s - %s' % (item[i], translation_table[i][item[i]])))
                else:
                    ans[i].add((value, '%s - %s' % (item[i], item[i])))

        for key in ans:
            used_keys = [x[0] for x in ans[key]]
            if '-' in used_keys:
                if len(used_keys) == 1:
                    ans[key] = ()
                elif len(used_keys) == 2:
                    ans[key].remove(('-', ''))
            elif len(used_keys) > 1:
                ans[key].add(('-', ''))
            ans[key] = sorted(ans[key], key=lambda item: item[1]) if ans[key] is not None else None
        return ans