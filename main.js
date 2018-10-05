class StartConditionsSerializer {
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

class StartConditionsDeserializer {
    getChild(node, cond) {
        return Array.from(node.children).find(cond)
    }

    getChildByName(node, name) {
        return Array.from(node.children).find(c => c.nodeName == name)
    }

    getNodeText(node, name) {
        let c =  this.getChildByName(node, name)
        if (c) { return c.textContent}
        return null
    }

   deserializeInventoryData(node) {
       let contents = this.getChildByName(node, "Contents")
        return {
            "node": node.nodeName,
            "prefabName": this.getNodeText(node, "PrefabName"),
            "type": this.getNodeText(node, "Type"),
            "slotId": this.getNodeText(node, "SlotId"),
            "stackSize": this.getNodeText(node, "StackSize"),
            "contents": contents ? Array.from(contents.children)
                                        .map(c => this.deserializeInventoryData(c)) : [],
        }
    }

    deserializeStartingConditions(xmlstring) {
        let parser = new DOMParser()
        let parsed = parser.parseFromString(xmlstring, 'application/xml')
        let startingConditions = parsed.getElementsByTagName("StartingConditions")[0].children
        return Array.from(startingConditions).map(condition => {
            return {
                "key": this.getChildByName(condition, "Key").textContent,
                "stringKey": this.getChildByName(condition, "StringKey").textContent,
                "playerInventory": Array.from(this.getChildByName(condition, "PlayerInventory").children).map(c => this.deserializeInventoryData(c))
            }
        })
    }
}


Vue.component('item-view', {
    props: ["item", "parent", "root"],
    methods: {
        selectPath(item) {
            if (this.root) {
                app.openPath.length = 0
                app.openPath.push(item)
            } else if (app.openPath[app.openPath.length -1] == item) {
                app.openPath.pop()
            } else {
                app.openPath.push(item)
            }
        }
    },
    template: `
        <div @click="selectPath(item)" class="item">
            <div>{{item.prefabName}}</div>
            <div>
                {{item.slotId && "Slot: " + item.slotId}} {{item.type}}
            </div>
            <button
                @click="parent.splice(parent.indexOf(item), 1)"
                title="Delete Item">
                X
            </button>
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
                    <div v-for="child in item.contents">
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
        openPath: [],
        file: null,
    },
    methods: {
        setConditions: function(c) {
            this.startConditions = c
            this.openPath = []
        },
        fileChanged: function(evt) {
            if (evt.target.files.length === 1) {
                let f = evt.target.files[0]
                let r = new FileReader()
                r.onload = () => {
                    console.log("hi")
                    let deserializer = new StartConditionsDeserializer()
                    app.setConditions(deserializer.deserializeStartingConditions(r.result))
                }
                r.readAsText(f)
            }
        },
    },
    computed: {
        downloadURL: function() {
            let serializer = new StartConditionsSerializer()
            return 'data:text/plain,'+encodeURIComponent(serializer.serializeConditions(this.startConditions))
        }
    }
})

fetch('startconditions.xml').then(r => r.text()).then(text => {
    let deserializer = new StartConditionsDeserializer()
    app.startConditions = deserializer.deserializeStartingConditions(text)
})

