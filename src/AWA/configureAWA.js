/**
 * AWA (Advanced Work Assignment) bootstrap script
 *
 * What it does (idempotent — safe to re-run):
 *   1. Enables core AWA system properties
 *   2. Creates / updates Service Channels (Incident + Chat) with bucket sizes
 *   3. Creates / updates Inboxes (awa_queue) per channel, bound to a group
 *   4. Creates / updates Assignment Criteria (filter for which records route)
 *   5. Sets every active member of the group as Available on each channel
 *
 * Edit the CONFIG block below, then run as a background script.
 * Set SIMULATE = true first to preview without writing.
 */

var SIMULATE = true; // set to false to actually create/update records

var CONFIG = {
    // Group whose members will work the AWA inboxes
    groupName: 'Service Desk',

    // Global AWA properties to flip on
    properties: {
        'com.snc.sn_advanced_work_assignment.enabled': 'true',
        'com.snc.awa.routing.enabled': 'true'
    },

    // Channels to configure. Bucket size = max concurrent items per agent.
    channels: [
        {
            channelName: 'Incident Work',
            tableName: 'incident',
            bucketSize: 5,
            // condition used by Assignment Criteria — only records matching this route
            routingCondition: 'active=true^assignment_groupISEMPTY^state=1',
            inboxName: 'Service Desk Incident Inbox',
            inboxOrder: 100
        },
        {
            channelName: 'Chat',
            tableName: 'interaction',
            bucketSize: 3,
            routingCondition: 'active=true^state=new^typeISchat',
            inboxName: 'Service Desk Chat Inbox',
            inboxOrder: 100
        }
    ]
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function log(msg) {
    gs.print((SIMULATE ? '[SIMULATE] ' : '[AWA] ') + msg);
}

function upsert(table, queryField, queryValue, fields) {
    var gr = new GlideRecord(table);
    gr.addQuery(queryField, queryValue);
    gr.query();

    var existing = gr.next();
    var action = existing ? 'update' : 'create';

    if (SIMULATE) {
        log(action + ' ' + table + ' where ' + queryField + '=' + queryValue);
        return existing ? gr.getUniqueValue() : null;
    }

    if (!existing) {
        gr.initialize();
        gr.setValue(queryField, queryValue);
    }
    for (var f in fields) {
        gr.setValue(f, fields[f]);
    }
    var sysId = gr.update();
    log(action + 'd ' + table + ' [' + sysId + '] ' + queryField + '=' + queryValue);
    return sysId;
}

function getGroupSysId(name) {
    var gr = new GlideRecord('sys_user_group');
    gr.addQuery('name', name);
    gr.setLimit(1);
    gr.query();
    if (gr.next()) return gr.getUniqueValue();
    log('WARNING: group "' + name + '" not found');
    return null;
}

function getTableSysId(tableName) {
    var gr = new GlideRecord('sys_db_object');
    gr.addQuery('name', tableName);
    gr.setLimit(1);
    gr.query();
    return gr.next() ? gr.getUniqueValue() : null;
}

// ---------------------------------------------------------------------------
// 1. System properties
// ---------------------------------------------------------------------------

function enableProperties() {
    log('--- Enabling AWA system properties ---');
    for (var key in CONFIG.properties) {
        var value = CONFIG.properties[key];
        if (SIMULATE) {
            log('set property ' + key + ' = ' + value);
            continue;
        }
        gs.setProperty(key, value);
        log('set property ' + key + ' = ' + value);
    }
}

// ---------------------------------------------------------------------------
// 2. Service Channel + bucket size
// ---------------------------------------------------------------------------

function upsertServiceChannel(channel) {
    return upsert('awa_service_channel', 'name', channel.channelName, {
        name: channel.channelName,
        table: channel.tableName,
        capacity: channel.bucketSize,
        active: true
    });
}

// ---------------------------------------------------------------------------
// 3. Inbox / Queue
// ---------------------------------------------------------------------------

function upsertInbox(channel, channelSysId, groupSysId) {
    return upsert('awa_queue', 'name', channel.inboxName, {
        name: channel.inboxName,
        service_channel: channelSysId,
        group: groupSysId,
        table: channel.tableName,
        order: channel.inboxOrder,
        active: true
    });
}

// ---------------------------------------------------------------------------
// 4. Assignment Criteria
// ---------------------------------------------------------------------------

function upsertAssignmentCriteria(channel, inboxSysId) {
    var critName = channel.inboxName + ' - Criteria';
    return upsert('awa_assignment_criteria', 'name', critName, {
        name: critName,
        queue: inboxSysId,
        table: channel.tableName,
        condition: channel.routingCondition,
        active: true
    });
}

// ---------------------------------------------------------------------------
// 5. Agent presence — mark group members Available on each channel
// ---------------------------------------------------------------------------

function setAgentsAvailable(groupSysId, channelSysId, channelName) {
    var members = new GlideRecord('sys_user_grmember');
    members.addQuery('group', groupSysId);
    members.query();

    var count = 0;
    while (members.next()) {
        var userSysId = members.getValue('user');

        var presence = new GlideRecord('awa_agent_presence_channel');
        presence.addQuery('agent', userSysId);
        presence.addQuery('service_channel', channelSysId);
        presence.setLimit(1);
        presence.query();

        if (SIMULATE) {
            log('set ' + members.getDisplayValue('user') + ' AVAILABLE on ' + channelName);
            count++;
            continue;
        }

        if (presence.next()) {
            presence.setValue('available', true);
            presence.update();
        } else {
            presence.initialize();
            presence.setValue('agent', userSysId);
            presence.setValue('service_channel', channelSysId);
            presence.setValue('available', true);
            presence.insert();
        }
        count++;
    }
    log('  -> ' + count + ' agents set Available on ' + channelName);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

(function main() {
    log('=== AWA bootstrap starting (SIMULATE=' + SIMULATE + ') ===');

    enableProperties();

    var groupSysId = getGroupSysId(CONFIG.groupName);
    if (!groupSysId && !SIMULATE) {
        gs.print('ABORT: group "' + CONFIG.groupName + '" missing');
        return;
    }

    for (var i = 0; i < CONFIG.channels.length; i++) {
        var ch = CONFIG.channels[i];
        log('--- Channel: ' + ch.channelName + ' (' + ch.tableName + ') ---');

        var channelSysId = upsertServiceChannel(ch);
        var inboxSysId = upsertInbox(ch, channelSysId, groupSysId);
        upsertAssignmentCriteria(ch, inboxSysId);

        if (channelSysId && groupSysId) {
            setAgentsAvailable(groupSysId, channelSysId, ch.channelName);
        }
    }

    log('=== AWA bootstrap done ===');
    if (SIMULATE) log('No changes written. Set SIMULATE = false to apply.');
})();
