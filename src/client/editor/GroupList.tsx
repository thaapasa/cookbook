import { type ReactNode, useState } from 'react';
import { Button, Input, Label, TextField } from 'react-aria-components';
import { Controller, type PathValue, useFormContext, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import { TrashIcon } from '../components/icons.tsx';
import {
  type EditorValues,
  type ItemPosition,
  moveInArray,
  moveItem,
  newKey,
  stepItem,
} from './form.ts';
import {
  DragHandle,
  dragRowAttribute,
  DropIndicator,
  focusHandle,
  useDropTarget,
} from './sortable.tsx';

type ListName = 'ingredientGroups' | 'stepGroups';
type Item = { key: string };
type Group<T extends Item> = { key: string; name: string; items: T[] };

export type ItemContext<T extends Item, N extends ListName> = {
  item: T;
  /** Form path of the item, such as `ingredientGroups.0.items.2`. */
  path: `${N}.${number}.items.${number}`;
  position: ItemPosition;
  /** Whether the item was just added and its first field should take focus. */
  autoFocus: boolean;
  handle: ReactNode;
  remove: () => void;
  /** Adds an empty item at the end of the group and focuses it. */
  addItem: () => void;
};

export function GroupList<T extends Item, N extends ListName>(props: {
  name: N;
  /** Drag type for items. Groups use the same type with a `-group` suffix. */
  itemType: string;
  newItem: () => T;
  ordered?: boolean;
  labels: {
    addItem: string;
    addGroup: string;
    moveItem: (item: T, position: ItemPosition) => string;
  };
  /** Content above the rows of each group, such as column headings. */
  columns?: ReactNode;
  renderItem: (context: ItemContext<T, N>) => ReactNode;
}) {
  const { name, itemType, newItem, ordered, labels, columns, renderItem } = props;
  const { t } = useTranslation();
  const { control, setValue, getValues, trigger, formState } = useFormContext<EditorValues>();
  const groups = useWatch({ control, name }) as unknown as Group<T>[];
  const [focusKey, setFocusKey] = useState<string | null>(null);
  const groupType = `${itemType}-group`;

  const current = () => getValues(name) as unknown as Group<T>[];
  const update = (next: Group<T>[]) => {
    setValue(name, next as unknown as PathValue<EditorValues, N>, { shouldDirty: true });
    // Errors are stored by index, so validate again after the rows move.
    if (formState.isSubmitted) void trigger(name);
  };
  const locate = (key: string): ItemPosition | null => {
    for (const [group, g] of current().entries()) {
      const index = g.items.findIndex((item) => item.key === key);
      if (index >= 0) return { group, index };
    }
    return null;
  };

  const dropItem = (key: string, to: ItemPosition) => {
    const from = locate(key);
    if (from) update(moveItem(current(), from, to));
  };
  const stepItemBy = (key: string, direction: -1 | 1) => {
    const from = locate(key);
    if (!from) return;
    update(stepItem(current(), from, direction));
    focusHandle(key);
  };
  const addItem = (group: number) => {
    const item = newItem();
    update(current().map((g, i) => (i === group ? { ...g, items: [...g.items, item] } : g)));
    setFocusKey(item.key);
  };
  const removeItem = (position: ItemPosition) =>
    update(
      current().map((g, i) =>
        i === position.group ? { ...g, items: g.items.filter((_, j) => j !== position.index) } : g,
      ),
    );

  const dropGroup = (key: string, to: number) => {
    const from = current().findIndex((g) => g.key === key);
    if (from >= 0) update(moveInArray(current(), from, to));
  };
  const stepGroup = (key: string, direction: -1 | 1) => {
    const list = current();
    const from = list.findIndex((g) => g.key === key);
    const to = direction < 0 ? from - 1 : from + 2;
    if (from < 0 || to < 0 || to > list.length) return;
    update(moveInArray(list, from, to));
    focusHandle(key);
  };
  const addGroup = () => {
    const key = newKey();
    update([...current(), { key, name: '', items: [newItem()] }]);
    setFocusKey(key);
  };
  const removeGroup = (group: number) => update(current().filter((_, i) => i !== group));

  const List = ordered ? 'ol' : 'ul';

  return (
    <>
      {groups.map((group, g) => (
        <div
          key={group.key}
          className="flex flex-col gap-2 rounded-[18px] border border-line-soft bg-card px-2 pt-3.5 pb-2.5 sm:px-3.5"
        >
          <GroupHeader
            type={groupType}
            groupKey={group.key}
            onDrop={(key, position) => dropGroup(key, position === 'before' ? g : g + 1)}
          >
            <DragHandle
              type={groupType}
              itemKey={group.key}
              label={
                group.name
                  ? t('editor.moveGroup', { name: group.name })
                  : t('editor.moveGroupEmpty')
              }
              onStep={(direction) => stepGroup(group.key, direction)}
            />
            <Controller
              control={control}
              name={`${name}.${g}.name`}
              render={({ field }) => (
                <TextField
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  autoFocus={focusKey === group.key}
                  className="max-w-80 min-w-0 flex-1"
                >
                  <Label className="sr-only">{t('editor.groupName')}</Label>
                  <Input
                    ref={field.ref}
                    placeholder={t('editor.groupNamePlaceholder')}
                    className="min-h-11 w-full rounded-xl border border-field bg-card px-3.5 py-2 font-semibold focus:border-accent focus:outline-2 focus:outline-offset-1 focus:outline-accent"
                  />
                </TextField>
              )}
            />
            <Button
              onPress={() => removeGroup(g)}
              aria-label={
                group.name
                  ? t('editor.removeGroupNamed', { name: group.name })
                  : t('editor.removeGroup')
              }
              className="ml-auto inline-flex min-h-11 flex-none cursor-pointer items-center gap-1.5 rounded-xl px-3 text-sm font-semibold text-muted hover:bg-danger-soft hover:text-accent-strong"
            >
              <TrashIcon size={16} />
              <span className="hidden sm:inline">{t('editor.removeGroup')}</span>
            </Button>
          </GroupHeader>
          {columns}
          <List className="flex flex-col gap-2" data-group={group.key}>
            {group.items.map((item, i) => (
              <ItemRow
                key={item.key}
                type={itemType}
                onDrop={(key, position) =>
                  dropItem(key, { group: g, index: position === 'before' ? i : i + 1 })
                }
              >
                {(onDraggingChange) =>
                  renderItem({
                    item,
                    path: `${name}.${g}.items.${i}`,
                    position: { group: g, index: i },
                    autoFocus: focusKey === item.key,
                    handle: (
                      <DragHandle
                        type={itemType}
                        itemKey={item.key}
                        label={labels.moveItem(item, { group: g, index: i })}
                        onStep={(direction) => stepItemBy(item.key, direction)}
                        onDraggingChange={onDraggingChange}
                      />
                    ),
                    remove: () => removeItem({ group: g, index: i }),
                    addItem: () => addItem(g),
                  })
                }
              </ItemRow>
            ))}
          </List>
          <AddItemButton
            type={itemType}
            onDrop={(key) => dropItem(key, { group: g, index: group.items.length })}
            onPress={() => addItem(g)}
          >
            {labels.addItem}
          </AddItemButton>
        </div>
      ))}
      <Button
        onPress={addGroup}
        className="min-h-11 cursor-pointer self-start rounded-full border border-dashed border-dashed-line px-4.5 text-[15px] font-semibold"
      >
        {labels.addGroup}
      </Button>
    </>
  );
}

function GroupHeader(props: {
  type: string;
  groupKey: string;
  onDrop: (key: string, position: 'before' | 'after') => void;
  children: ReactNode;
}) {
  const { ref, position } = useDropTarget<HTMLDivElement>(props.type, props.onDrop);
  return (
    <div ref={ref} {...{ [dragRowAttribute]: '' }} className="relative flex items-center gap-1.5">
      {props.children}
      <DropIndicator position={position} />
    </div>
  );
}

function ItemRow(props: {
  type: string;
  onDrop: (key: string, position: 'before' | 'after') => void;
  children: (onDraggingChange: (dragging: boolean) => void) => ReactNode;
}) {
  const { ref, position } = useDropTarget<HTMLLIElement>(props.type, props.onDrop);
  const [dragging, setDragging] = useState(false);
  return (
    <li
      ref={ref}
      {...{ [dragRowAttribute]: '' }}
      className={`relative rounded-xl bg-card ${dragging ? 'opacity-40' : ''}`}
    >
      {props.children(setDragging)}
      <DropIndicator position={position} />
    </li>
  );
}

function AddItemButton(props: {
  type: string;
  onDrop: (key: string) => void;
  onPress: () => void;
  children: ReactNode;
}) {
  const { ref, position } = useDropTarget<HTMLDivElement>(props.type, props.onDrop, 'before');
  return (
    <div ref={ref} className="relative self-stretch">
      <Button
        onPress={props.onPress}
        className="min-h-11 cursor-pointer px-1 text-[15px] font-semibold text-accent-strong"
      >
        {props.children}
      </Button>
      <DropIndicator position={position} />
    </div>
  );
}
