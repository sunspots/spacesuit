class InventorySerializer {
    addText(node, text) {
        node.appendChild(this.doc.createTextNode(text))
    }

    addChild(node, childName) {
        let child = this.doc.createElement(childName)
        node.appendChild(child)
        return child
    }

    addTextNode(node, childName, text) {
        if (text == null) { return }
        let child = this.addChild(node, childName)
        this.addText(child, text)
        return child
    }

    serializeInventoryData(parentNode, inventoryDataList) {
        inventoryDataList.forEach(inventoryData => {
            let inventoryDataNode = this.addChild(parentNode, "InventoryData")
            this.addTextNode(inventoryDataNode, "PrefabName", inventoryData.prefabName)
            this.addTextNode(inventoryDataNode, "Type", inventoryData.type)
            this.addTextNode(inventoryDataNode, "SlotId", inventoryData.slotId)
            this.addTextNode(inventoryDataNode, "StackSize", inventoryData.stackSize)
            if (inventoryData.contents.length > 0) {
                let contents = this.addChild(inventoryDataNode, "Contents")
                this.serializeInventoryData(contents, inventoryData.contents)
            }
        })
    }

    serializeConditionData(condition) {
        let conditionNode = this.doc.createElement("ConditionData")
        this.addTextNode(conditionNode, "Key", condition.key)
        this.addTextNode(conditionNode, "StringKey", condition.stringKey)
        let playerInventory = this.addChild(conditionNode, "PlayerInventory")
        this.serializeInventoryData(playerInventory, condition.playerInventory)
        return conditionNode
    }

    serializeConditions(conditions) {
        this.doc = document.implementation.createDocument("", "GameData", null)
        let conditionsNode = this.doc.createElement("StartingConditions")
        this.doc.firstChild.appendChild(conditionsNode)
        conditions.forEach(condition => {
            conditionsNode.appendChild(this.serializeConditionData(condition))
        })
        return new XMLSerializer().serializeToString(this.doc)
    }
}





Vue.component('item-view', {
    props: ["item", "parent"],
    methods: {
        selectPath(item) {
            if (app.openPath[app.openPath.length -1] == item) {
                app.openPath.pop()
            } else {
                app.openPath.push(item)
            }
        }
    },
    template: `
        <div>
            <button@click="selectPath(item)">{{item.prefabName}}</button>
            <button @click="parent.splice(parent.indexOf(item), 1)">X</button>
        </div>
    `
})


Vue.component('item-contents', {
    props: ["item"],
    methods: {
        back() {
            app.openPath.pop()
        }
    },
    template: `
        <div class="item-contents">
            <div v-if="item">
                <div class="head">
                    <button @click="back">&lt;</button>
                    <input v-model="item.prefabName">
                    <button @click="item.contents.push({prefabName:'', contents:[]})">+</button>
                </div>
                <div class="items" v-if="">
                    <div v-for="child in item.contents" class="item">
                        <item-view v-bind:item="child" v-bind:parent="item.contents"/>
                    </div>
                </div>
            </div>
        </div>
    `
})

var app = new Vue({
    el: '#app',
    data: {
        title: 'Start Condition Editor',
        startConditions: [],
        openPath: []
    },
    computed: {
        downloadURL: function() {
            let serializer = new InventorySerializer()
            return 'data:text/plain,'+encodeURIComponent(serializer.serializeConditions(this.startConditions))
        }
    }
})

function getChild(node, cond) {
    return Array.from(node.children).find(cond)
}

function getChildByName(node, name) {
    return Array.from(node.children).find(c => c.nodeName == name)
}

function getNodeText(node, name) {
    c =  getChildByName(node, name)
    if (c) { return c.textContent}
    return null
}


function parseInventoryData(node) {
    let contents = getChildByName(node, "Contents")
    return {
        "node": node.nodeName,
        "prefabName": getNodeText(node, "PrefabName"),
        "type": getNodeText(node, "Type"),
        "slotId": getNodeText(node, "SlotId"),
        "stackSize": getNodeText(node, "StackSize"),
        "contents": contents ? Array.from(contents.children).map(parseInventoryData) : [],
    }
}

function parseStartingConditions(xmlstring) {
    let parsed = parser.parseFromString(xmlstring, 'application/xml')
    let startingConditions = parsed.getElementsByTagName("StartingConditions")[0].children

    return Array.from(startingConditions).map(condition => {
        return {
            "key": getChildByName(condition, "Key").textContent,
            "stringKey": getChildByName(condition, "StringKey").textContent,
            "playerInventory": Array.from(getChildByName(condition, "PlayerInventory").children).map(parseInventoryData)
        }
    })
}

let parser = new DOMParser()
fetch('startconditions.xml').then(r => r.text()).then(text => {
    app.startConditions = parseStartingConditions(text)
})


